<?php
// auth/verify-device.php - Verify device and activate key
// Endpoint: POST /auth/verify-device

require_once dirname(__DIR__) . '/config.php';
require_once dirname(__DIR__) . '/auth/rate-limit.php';

requirePostRequest();

// Rate limiting
$rateLimiter = new RateLimit($pdo);
$clientIP = RateLimit::getClientIP();
if (!$rateLimiter->check($clientIP . '_verify_device', 20, 3600)) {
    sendResponse(false, 'Too many verification requests. Please try again later.', null, 429);
}

$data = readJsonRequest();
$key = strtoupper(cleanInput($data['key'] ?? '', 80));
$deviceFingerprint = cleanInput($data['deviceFingerprint'] ?? '', 160);
$deviceInfo = $data['deviceInfo'] ?? [];

if (empty($key)) {
    sendResponse(false, 'Key is required');
}
if (!preg_match('/^[A-Z0-9\\-]+$/', $key)) {
    sendResponse(false, 'Invalid key');
}

if (empty($deviceFingerprint)) {
    sendResponse(false, 'Device fingerprint is required');
}
if (!RateLimit::isValidDeviceId($deviceFingerprint)) {
    sendResponse(false, 'Invalid device fingerprint');
}
if (!is_array($deviceInfo)) {
    $deviceInfo = [];
}

// Check if key exists (key_code matches Prisma schema)
$stmt = $pdo->prepare('SELECT * FROM activation_keys WHERE key_code = ?');
$stmt->execute([$key]);
$keyData = $stmt->fetch();

if (!$keyData) {
    sendResponse(false, 'Invalid activation key');
}

if (in_array($keyData['status'], ['revoked', 'suspended'], true)) {
    sendResponse(false, 'This key is not allowed');
}

// Expiry check (expires_at matches the unified schema)
if (keyIsExpired($keyData)) {
    markKeyExpired($pdo, $key);
    sendResponse(false, 'This key has expired');
}

// Device binding via the `devices` table + max_devices (no device_id column)
if ($keyData['status'] === 'active' && isBoundToAnotherDevice($pdo, $keyData, $deviceFingerprint)) {
    sendResponse(false, 'This key is already activated on another device');
}

// Validate device info sub-field lengths
foreach (['deviceName', 'hostname', 'os', 'platform', 'cpu', 'ram', 'disk', 'gpu', 'screen'] as $field) {
    if (isset($deviceInfo[$field]) && is_string($deviceInfo[$field])) {
        $deviceInfo[$field] = cleanInput($deviceInfo[$field], 255);
    }
}

// Save/update device info (canonical upsert, enforces max_devices)
[$ok, $message] = upsertKeyDevice($pdo, $keyData, $deviceFingerprint, $deviceInfo);
if (!$ok) {
    sendResponse(false, $message);
}

// If key is pending, activate it and stamp expiry on first use
if ($keyData['status'] === 'pending' || $keyData['status'] === 'available') {
    $stmt = $pdo->prepare('UPDATE activation_keys SET status = "active", activated_at = COALESCE(activated_at, NOW()), expires_at = COALESCE(expires_at, DATE_ADD(NOW(), INTERVAL duration_days DAY)) WHERE key_code = ?');
    $stmt->execute([$key]);
    $stmt = $pdo->prepare('SELECT expires_at FROM activation_keys WHERE key_code = ?');
    $stmt->execute([$key]);
    $refreshed = $stmt->fetch();
    $keyData['expires_at'] = $refreshed['expires_at'] ?? $keyData['expires_at'];
} elseif ($keyData['status'] !== 'active') {
    sendResponse(false, 'This key is not available');
}

// Log the action
logAction($pdo, 'device_verified', "Key: $key, Device: $deviceFingerprint, IP: $clientIP");

// Return success (expires_at matches Prisma schema)
sendResponse(true, 'Device verified successfully', [
    'key' => $key,
    'status' => 'active',
    'expiryDate' => $keyData['expires_at'],
    'deviceId' => $deviceFingerprint
]);
