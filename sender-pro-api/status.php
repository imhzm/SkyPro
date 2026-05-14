<?php
// status.php - Check key status (secured)
// Changed from GET to POST with rate limiting and response masking

require_once 'config.php';

requirePostRequest();

// Rate limiting
require_once 'auth/rate-limit.php';
$rateLimiter = new RateLimit($pdo);
$clientIP = RateLimit::getClientIP();
if (!$rateLimiter->check($clientIP . '_status', 10, 3600)) {
    sendResponse(false, 'Too many requests. Please try again later.', null, 429);
}

$data = readJsonRequest();
$key = strtoupper(cleanInput($data['key'] ?? '', 120));

if (empty($key)) {
    sendResponse(false, 'Key is required');
}
if (!preg_match('/^[A-Z0-9\\-]+$/', $key)) {
    sendResponse(false, 'Invalid key');
}

$stmt = $pdo->prepare("SELECT key_code, status, expires_at, device_id, activated_at FROM activation_keys WHERE key_code = ?");
$stmt->execute([$key]);
$keyData = $stmt->fetch();

if (!$keyData) {
    // Don't reveal difference between invalid key and non-existent key
    sendResponse(false, 'Key not found or invalid');
}

// Mask deviceId — only show last 8 characters for privacy
$maskedDeviceId = '';
if (!empty($keyData['device_id'])) {
    $deviceId = $keyData['device_id'];
    $len = strlen($deviceId);
    if ($len > 8) {
        $maskedDeviceId = str_repeat('*', $len - 8) . substr($deviceId, -8);
    } else {
        $maskedDeviceId = str_repeat('*', $len);
    }
}

sendResponse(true, 'Status retrieved', [
    'status' => $keyData['status'],
    'expiryDate' => $keyData['expires_at'],
    'deviceBound' => !empty($keyData['device_id']),
    'deviceHint' => $maskedDeviceId,
    'activatedAt' => $keyData['activated_at']
]);
