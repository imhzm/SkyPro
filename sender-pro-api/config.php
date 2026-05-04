<?php
// config.php - Database Configuration & App Bootstrap

// Load .env file if it exists
function loadEnv($path) {
    if (!file_exists($path)) return;
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#' || $line[0] === ';') continue;
        if (strpos($line, '=') === false) continue;
        list($key, $value) = explode('=', $line, 2);
        $key = trim($key);
        $value = trim($value);
        // Remove surrounding quotes
        if ((($value[0] ?? '') === '"' && ($value[-1] ?? '') === '"') ||
            (($value[0] ?? '') === "'" && ($value[-1] ?? '') === "'")) {
            $value = substr($value, 1, -1);
        }
        putenv($key . '=' . $value);
        $_ENV[$key] = $value;
        $_SERVER[$key] = $value;
    }
}

loadEnv(__DIR__ . '/.env');

// CORS Configuration - Explicit allowlist only
$allowedOrigins = array_values(array_filter(
    array_map('trim', explode(',', getenv('ALLOWED_ORIGINS') ?: '')),
    fn($origin) => $origin !== ''
));
$allowNullOrigin = strtolower(getenv('ALLOW_NULL_ORIGIN') ?: 'false') === 'true';
$requestOrigin = $_SERVER['HTTP_ORIGIN'] ?? '';

if (empty($allowedOrigins)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server is not configured: ALLOWED_ORIGINS is empty']);
    exit();
}

if ($requestOrigin !== '' && in_array($requestOrigin, $allowedOrigins, true)) {
    header('Access-Control-Allow-Origin: ' . $requestOrigin);
    header('Access-Control-Allow-Credentials: true');
} elseif (($requestOrigin === 'null' || $requestOrigin === 'file://') && $allowNullOrigin) {
    header('Access-Control-Allow-Origin: ' . $requestOrigin);
} else {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Origin not allowed']);
    exit();
}

header('Content-Type: application/json');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Max-Age: 86400');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Database credentials from environment
$app_env = getenv('APP_ENV') ?: 'production';
$db_host = getenv('DB_HOST') ?: '127.0.0.1';
$db_name = getenv('DB_NAME') ?: 'senderpro';
$db_user = getenv('DB_USER') ?: '';
$db_pass = getenv('DB_PASS') ?: '';
if ($db_user === '' || $db_pass === '') {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server is not configured: missing database credentials']);
    exit();
}
if ($app_env === 'production' && strtolower($db_user) === 'root') {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server is not configured: root database user is not allowed']);
    exit();
}
$jwt_secret = getenv('JWT_SECRET') ?: '';
if ($jwt_secret === '' || $jwt_secret === 'change_this_secret' || strlen($jwt_secret) < 32) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server is not configured: invalid JWT_SECRET']);
    exit();
}

try {
    $pdo = new PDO("mysql:host=$db_host;dbname=$db_name;charset=utf8mb4", $db_user, $db_pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Database connection failed']);
    exit();
}

// Initialize JWT
require_once __DIR__ . '/auth/jwt-helper.php';
JWT::init($jwt_secret);

// Helper: send JSON response
function sendResponse($success, $message, $data = null, $httpCode = 200) {
    http_response_code($httpCode);
    $response = ['success' => $success, 'message' => $message];
    if ($data !== null) {
        $response['data'] = $data;
    }
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    exit();
}

function requirePostRequest() {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        sendResponse(false, 'Method not allowed', null, 405);
    }
}

function readJsonRequest($maxBytes = 8192) {
    $contentLength = intval($_SERVER['CONTENT_LENGTH'] ?? 0);
    if ($contentLength > $maxBytes) {
        sendResponse(false, 'Request body is too large', null, 413);
    }

    $raw = file_get_contents('php://input');
    if ($raw === false || strlen($raw) > $maxBytes) {
        sendResponse(false, 'Request body is too large', null, 413);
    }

    $data = json_decode($raw, true);
    if (!is_array($data)) {
        sendResponse(false, 'Invalid JSON body', null, 400);
    }

    return $data;
}

function cleanInput($value, $maxLength = 255) {
    $value = trim((string)$value);
    if (function_exists('mb_substr')) {
        return mb_substr($value, 0, $maxLength);
    }
    return substr($value, 0, $maxLength);
}

// Helper: generate activation key (cryptographically secure, 128-bit entropy)
function generateKey() {
    $parts = [];
    for ($i = 0; $i < 4; $i++) {
        $parts[] = strtoupper(bin2hex(random_bytes(4)));
    }
    return implode('-', $parts);
}

// Helper: generate secure serial
function generateSerial() {
    return bin2hex(random_bytes(16)) . strtoupper(substr(bin2hex(random_bytes(8)), 0, 16));
}

// Helper: log action to database
function logAction($pdo, $action, $details = '', $ip = null) {
    try {
        $stmt = $pdo->prepare('INSERT INTO app_logs (action, details, ip_address) VALUES (?, ?, ?)');
        $stmt->execute([$action, $details, $ip ?: ($_SERVER['REMOTE_ADDR'] ?? '')]);
    } catch (Exception $e) { /* fail silently */ }
}
