<?php
// auth/reset-device.php - Reset device for a key (admin action)
// Endpoint: POST /auth/reset-device
// Requires JWT token authentication

require_once dirname(__DIR__) . '/config.php';
require_once dirname(__DIR__) . '/auth/rate-limit.php';

requirePostRequest();

// Rate limiting
$rateLimiter = new RateLimit($pdo);
$clientIP = RateLimit::getClientIP();
if (!$rateLimiter->check($clientIP . '_reset_device', 5, 3600)) {
    sendResponse(false, 'Too many reset requests. Please try again later.', null, 429);
}

// Require JWT authentication for this action
$token = JWT::getBearerToken();
if (!$token) {
    sendResponse(false, 'Authentication required', null, 401);
}
$payload = JWT::decode($token);
if (!$payload || ($payload['role'] ?? '') !== 'admin') {
    sendResponse(false, 'Admin access required', null, 403);
}

$data = readJsonRequest();
$key = strtoupper(cleanInput($data['key'] ?? '', 80));
$deviceFingerprint = cleanInput($data['deviceFingerprint'] ?? '', 160);

if (empty($key)) {
    sendResponse(false, 'Key is required');
}
if (!preg_match('/^[A-Z0-9\\-]+$/', $key)) {
    sendResponse(false, 'Invalid key');
}
if (!empty($deviceFingerprint) && !RateLimit::isValidDeviceId($deviceFingerprint)) {
    sendResponse(false, 'Invalid device fingerprint');
}

// Check if key exists (key_code matches Prisma schema)
$stmt = $pdo->prepare('SELECT * FROM activation_keys WHERE key_code = ?');
$stmt->execute([$key]);
$keyData = $stmt->fetch();

if (!$keyData) {
    sendResponse(false, 'Invalid activation key');
}

if (in_array($keyData['status'], ['revoked', 'expired', 'suspended'], true)) {
    sendResponse(false, 'This activation key cannot be reset');
}

// Set the key back to pending. There is no device_id column on activation_keys;
// device binding lives in the `devices` table and is cleared below.
$stmt = $pdo->prepare('UPDATE activation_keys SET status = "pending" WHERE key_code = ?');
$stmt->execute([$key]);

// Remove the device binding(s) scoped to this key so a free slot opens up.
if (!empty($keyData['id'])) {
    if (!empty($deviceFingerprint)) {
        $stmt = $pdo->prepare('DELETE FROM devices WHERE device_fingerprint = ? AND key_id = ?');
        $stmt->execute([$deviceFingerprint, $keyData['id']]);
    } else {
        // No specific device given — release every binding on the key.
        $stmt = $pdo->prepare('DELETE FROM devices WHERE key_id = ?');
        $stmt->execute([$keyData['id']]);
    }
}

// Log the action
logAction($pdo, 'device_reset', "Key: $key, IP: $clientIP");

sendResponse(true, 'Device reset successfully', [
    'key' => $key,
    'status' => 'pending',
    'deviceId' => null
]);
