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
        if (($value[0] ?? '') === '"' && (substr($value, -1) ?? '') === '"') {
            $value = substr($value, 1, -1);
        }
        if (($value[0] ?? '') === "'" && (substr($value, -1) ?? '') === "'") {
            $value = substr($value, 1, -1);
        }
        putenv($key . '=' . $value);
        $_ENV[$key] = $value;
        $_SERVER[$key] = $value;
    }
}

loadEnv(__DIR__ . '/.env');

// Application environment — defined BEFORE the security headers below that
// depend on it (HSTS / HTTPS enforcement). Previously this was set further
// down the file, so $app_env was null at the point of use and both controls
// were silently dead. Keep this as the single definition.
$app_env = getenv('APP_ENV') ?: 'production';

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

// Security headers
header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('Permissions-Policy: geolocation=(), microphone=(), camera=()');

// HSTS — only in production
if ($app_env === 'production') {
    header('Strict-Transport-Security: max-age=31536000; includeSubDomains; preload');
}

// HTTPS enforcement
if ($app_env === 'production' && empty($_SERVER['HTTPS']) && ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') !== 'https') {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'HTTPS is required']);
    exit();
}

header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Admin-Key');
header('Access-Control-Max-Age: 86400');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Database credentials from environment ($app_env is defined near the top)
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

// ============================================================
// Licensing helpers — single source of truth for key / device logic.
// Schema reference (sender_pro_database.sql, unified with Prisma):
//   - activation_keys has columns: id, user_id, key_code, status, plan,
//     duration_days, max_devices, activated_at, expires_at, created_at.
//     There is NO `device_id` and NO `expiry_date` column.
//   - Device binding lives in the `devices` table (key_id + device_fingerprint),
//     capped by activation_keys.max_devices.
// These helpers replace the previously duplicated (and schema-drifted) blocks
// scattered across activate/validate/verify-device/login.
// ============================================================

// True if a key is expired by status or by its expires_at timestamp.
function keyIsExpired(array $keyData): bool {
    if (($keyData['status'] ?? '') === 'expired') {
        return true;
    }
    $expiresAt = $keyData['expires_at'] ?? null;
    return !empty($expiresAt) && $expiresAt < date('Y-m-d H:i:s');
}

// Marks a key as expired (idempotent).
function markKeyExpired(PDO $pdo, string $keyCode): void {
    $pdo->prepare('UPDATE activation_keys SET status = "expired" WHERE key_code = ?')->execute([$keyCode]);
}

// Number of active devices currently bound to a key.
function activeDeviceCount(PDO $pdo, int $keyId): int {
    $stmt = $pdo->prepare('SELECT COUNT(*) AS cnt FROM devices WHERE key_id = ? AND is_active = 1');
    $stmt->execute([$keyId]);
    $row = $stmt->fetch();
    return (int)($row['cnt'] ?? 0);
}

// True when a key has no free device slots AND the given fingerprint is not
// already one of its active devices (i.e. it is bound to other device(s)).
function isBoundToAnotherDevice(PDO $pdo, array $keyData, string $fingerprint): bool {
    $keyId = (int)($keyData['id'] ?? 0);
    if ($keyId <= 0) {
        return false;
    }
    if ($fingerprint !== '') {
        $stmt = $pdo->prepare('SELECT 1 FROM devices WHERE key_id = ? AND device_fingerprint = ? AND is_active = 1 LIMIT 1');
        $stmt->execute([$keyId, $fingerprint]);
        if ($stmt->fetch()) {
            return false; // this device is already bound — not "another device"
        }
    }
    $maxDevices = max(1, (int)($keyData['max_devices'] ?? 1));
    return activeDeviceCount($pdo, $keyId) >= $maxDevices;
}

// Canonical device upsert, keyed by the globally-unique device_fingerprint.
// Enforces max_devices on first bind. Returns [true, null] on success, or
// [false, message] when the device limit is reached.
function upsertKeyDevice(PDO $pdo, array $keyData, string $fingerprint, array $deviceInfo): array {
    $keyId = (int)($keyData['id'] ?? 0);
    if ($keyId <= 0 || $fingerprint === '') {
        return [true, null];
    }

    $stmt = $pdo->prepare('SELECT id FROM devices WHERE device_fingerprint = ?');
    $stmt->execute([$fingerprint]);
    $existing = $stmt->fetch();

    if ($existing) {
        $pdo->prepare('UPDATE devices SET last_seen_at = NOW(), is_active = 1 WHERE id = ?')->execute([$existing['id']]);
        return [true, null];
    }

    $maxDevices = max(1, (int)($keyData['max_devices'] ?? 1));
    if (activeDeviceCount($pdo, $keyId) >= $maxDevices) {
        return [false, "تم تجاوز الحد الأقصى للأجهزة ($maxDevices)"];
    }

    $insert = $pdo->prepare('INSERT INTO devices (user_id, key_id, device_fingerprint, device_name, os_info, cpu_info, ram_info, disk_info, gpu_info, screen_resolution, is_active, reset_count, max_resets_per_year, first_seen_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 2, NOW(), NOW())');
    $insert->execute([
        $keyData['user_id'] ?? null,
        $keyId,
        $fingerprint,
        $deviceInfo['deviceName'] ?? ($deviceInfo['hostname'] ?? ''),
        $deviceInfo['os'] ?? ($deviceInfo['platform'] ?? ''),
        $deviceInfo['cpu'] ?? '',
        $deviceInfo['ram'] ?? '',
        $deviceInfo['disk'] ?? '',
        $deviceInfo['gpu'] ?? '',
        $deviceInfo['screen'] ?? '',
    ]);
    return [true, null];
}

// Returns a masked hint (last 8 chars) of the active device bound to a key, or ''.
function activeDeviceHint(PDO $pdo, int $keyId): string {
    if ($keyId <= 0) {
        return '';
    }
    $stmt = $pdo->prepare('SELECT device_fingerprint FROM devices WHERE key_id = ? AND is_active = 1 ORDER BY last_seen_at DESC LIMIT 1');
    $stmt->execute([$keyId]);
    $row = $stmt->fetch();
    $fp = $row['device_fingerprint'] ?? '';
    if ($fp === '') {
        return '';
    }
    $len = strlen($fp);
    return $len > 8 ? str_repeat('*', $len - 8) . substr($fp, -8) : str_repeat('*', $len);
}
