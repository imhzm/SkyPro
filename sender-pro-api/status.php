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

// Only select columns that exist in the unified schema (no device_id column).
$stmt = $pdo->prepare("SELECT id, key_code, status, expires_at, activated_at FROM activation_keys WHERE key_code = ?");
$stmt->execute([$key]);
$keyData = $stmt->fetch();

if (!$keyData) {
    // Don't reveal difference between invalid key and non-existent key
    sendResponse(false, 'Key not found or invalid');
}

// Device binding is derived from the `devices` table. Show a masked hint only.
$activeDevices = activeDeviceCount($pdo, (int)$keyData['id']);
$deviceHint = activeDeviceHint($pdo, (int)$keyData['id']);

sendResponse(true, 'Status retrieved', [
    'status' => $keyData['status'],
    'expiryDate' => $keyData['expires_at'],
    'deviceBound' => $activeDevices > 0,
    'deviceHint' => $deviceHint,
    'activatedAt' => $keyData['activated_at']
]);
