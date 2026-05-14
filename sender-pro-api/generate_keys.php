<?php
// generate_keys.php - Generate new activation keys (Admin only)

require_once 'config.php';
require_once 'auth/rate-limit.php';

requirePostRequest();

// Rate limiting: max 10 requests per hour per IP
$rateLimiter = new RateLimit($pdo);
$clientIP = RateLimit::getClientIP();
if (!$rateLimiter->check($clientIP . '_generate_keys', 10, 3600)) {
    sendResponse(false, 'Too many requests. Please try again later.', null, 429);
}

$expectedAdminKey = getenv('ADMIN_API_KEY') ?: '';
if ($expectedAdminKey === '' || strlen($expectedAdminKey) < 24) {
    sendResponse(false, 'Server is not configured: invalid ADMIN_API_KEY', null, 500);
}

$providedAdminKey = '';
$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
if (preg_match('/^Bearer\s+(.+)$/i', $authHeader, $matches) === 1) {
    $providedAdminKey = trim($matches[1]);
}
if ($providedAdminKey === '' && isset($_SERVER['HTTP_X_ADMIN_KEY'])) {
    $providedAdminKey = trim($_SERVER['HTTP_X_ADMIN_KEY']);
}

if ($providedAdminKey === '' || !hash_equals($expectedAdminKey, $providedAdminKey)) {
    sendResponse(false, 'Unauthorized', null, 401);
}

$input = readJsonRequest(4096);
$count = intval($input['count'] ?? 10);
$expiryDate = cleanInput($input['expiry'] ?? date('Y-m-d', strtotime('+1 year')), 32);

if ($count < 1 || $count > 200) {
    sendResponse(false, 'Count must be between 1 and 200', null, 400);
}

$parsedExpiry = strtotime($expiryDate);
if ($parsedExpiry === false) {
    sendResponse(false, 'Invalid expiry date format', null, 400);
}
$expiryDate = date('Y-m-d', $parsedExpiry);

$generated = [];
$maxTotalRetries = $count * 3;
$totalRetries = 0;

for ($i = 0; $i < $count && $totalRetries < $maxTotalRetries; $i++) {
    $key = generateKey();
    $totalRetries++;
    
    try {
        $stmt = $pdo->prepare("INSERT INTO activation_keys (key_code, expires_at) VALUES (?, ?)");
        $stmt->execute([$key, $expiryDate]);
        $generated[] = $key;
    } catch (PDOException $e) {
        if ($e->getCode() === '23000' || str_contains($e->getMessage(), 'Duplicate')) {
            $i--;
        }
    }
}

sendResponse(true, "Generated " . count($generated) . " keys", [
    'keys' => $generated,
    'expiryDate' => $expiryDate
]);
