<?php
// validate.php - Validate a key
// Endpoint: POST /validate

require_once 'config.php';
require_once 'auth/rate-limit.php';

requirePostRequest();

// Rate limiting: max 30 requests per hour per IP
$rateLimiter = new RateLimit($pdo);
$clientIP = RateLimit::getClientIP();
if (!$rateLimiter->check($clientIP . '_validate', 30, 3600)) {
    sendResponse(false, 'Too many validation requests. Please try again later.', null, 429);
}

$data = readJsonRequest();
$key = strtoupper(cleanInput($data['key'] ?? '', 80));
$deviceId = cleanInput($data['deviceFingerprint'] ?? '', 160);
$deviceInfo = $data['deviceInfo'] ?? [];

if (empty($key)) {
    sendResponse(false, 'Key is required');
}
if (!preg_match('/^[A-Z0-9\\-]+$/', $key)) {
    sendResponse(false, 'Invalid key');
}
if (!empty($deviceId) && !RateLimit::isValidDeviceId($deviceId)) {
    sendResponse(false, 'Invalid device fingerprint');
}
if (!is_array($deviceInfo)) {
    $deviceInfo = [];
}

$stmt = $pdo->prepare('SELECT * FROM activation_keys WHERE key_code = ?');
$stmt->execute([$key]);
$keyData = $stmt->fetch();

if (!$keyData) {
    logAction($pdo, 'validation_failed', "Key not found: $key, IP: $clientIP");
    sendResponse(false, 'Invalid activation key');
}

// Expiry check (expires_at matches the unified schema; there is no expiry_date column)
if (keyIsExpired($keyData)) {
    markKeyExpired($pdo, $key);
    logAction($pdo, 'validation_failed', "Key expired: $key, IP: $clientIP");
    sendResponse(false, 'This key has expired');
}

// Device binding is enforced through the `devices` table + max_devices, NOT a
// non-existent activation_keys.device_id column.
if ($keyData['status'] === 'active' && isBoundToAnotherDevice($pdo, $keyData, $deviceId)) {
    logAction($pdo, 'validation_failed', "Device limit/mismatch for key: $key, IP: $clientIP");
    sendResponse(false, 'This key is already activated on another device');
}

// Validate device info sub-field lengths
foreach (['deviceName', 'hostname', 'os', 'platform', 'arch', 'cpu', 'ram', 'disk', 'gpu', 'screen'] as $field) {
    if (isset($deviceInfo[$field]) && is_string($deviceInfo[$field])) {
        $deviceInfo[$field] = cleanInput($deviceInfo[$field], 255);
    }
}

// Save/update device info if provided (canonical upsert, enforces max_devices)
if (!empty($deviceInfo) && !empty($deviceId)) {
    [$ok, $message] = upsertKeyDevice($pdo, $keyData, $deviceId, $deviceInfo);
    if (!$ok) {
        logAction($pdo, 'validation_failed', "Device limit reached for key: $key, IP: $clientIP");
        sendResponse(false, $message);
    }
}

// Log successful validation
logAction($pdo, 'validation_success', "Key: $key, Device: $deviceId, IP: $clientIP");

sendResponse(true, 'Key is valid', [
    'key' => $key,
    'status' => $keyData['status'],
    'expiryDate' => $keyData['expires_at'],
    'deviceId' => $deviceId
]);
