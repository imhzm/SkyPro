<?php
// activate.php - Activate a key
// Endpoint: POST /activate

require_once 'config.php';
require_once 'auth/rate-limit.php';

requirePostRequest();

// Rate limiting: max 20 attempts per hour per IP
$rateLimiter = new RateLimit($pdo);
$clientIP = RateLimit::getClientIP();
if (!$rateLimiter->check($clientIP . '_activate', 20, 3600)) {
    sendResponse(false, 'Too many activation attempts. Please try again later.', null, 429);
}

$data = readJsonRequest();
$key = strtoupper(cleanInput($data['key'] ?? '', 80));
$deviceId = cleanInput($data['deviceFingerprint'] ?? '', 160);
$deviceInfo = $data['deviceInfo'] ?? [];

if (empty($key) || empty($deviceId)) {
    sendResponse(false, 'Key and device ID are required');
}
if (!preg_match('/^[A-Z0-9\\-]+$/', $key)) {
    sendResponse(false, 'Invalid key');
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

if ($keyData['status'] === 'expired') {
    sendResponse(false, 'This key has expired');
}

if ($keyData['status'] === 'active' && $keyData['device_id'] && $keyData['device_id'] !== $deviceId) {
    sendResponse(false, 'This key is already activated on another device');
}

// Save/update device info (matches Prisma schema)
if (!empty($deviceInfo) && !empty($deviceId)) {
    $checkStmt = $pdo->prepare('SELECT id, user_id, key_id FROM devices WHERE device_fingerprint = ?');
    $checkStmt->execute([$deviceId]);
    $existingDevice = $checkStmt->fetch();

    if ($existingDevice) {
        $updateStmt = $pdo->prepare('UPDATE devices SET last_seen_at = NOW() WHERE device_fingerprint = ?');
        $updateStmt->execute([$deviceId]);
    } else {
        // Get user_id and key_id from activation key
        $keyStmt = $pdo->prepare('SELECT user_id, id FROM activation_keys WHERE key_code = ?');
        $keyStmt->execute([$key]);
        $keyInfo = $keyStmt->fetch();

        $insertStmt = $pdo->prepare('INSERT INTO devices (user_id, key_id, device_fingerprint, device_name, os_info, cpu_info, ram_info, disk_info, gpu_info, screen_resolution, is_active, reset_count, max_resets_per_year, first_seen_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 2, NOW(), NOW())');
        $insertStmt->execute([
            $keyInfo['user_id'] ?? null,
            $keyInfo['id'] ?? null,
            $deviceId,
            $deviceInfo['deviceName'] ?? ($deviceInfo['hostname'] ?? ''),
            $deviceInfo['os'] ?? ($deviceInfo['platform'] ?? ''),
            $deviceInfo['cpu'] ?? '',
            $deviceInfo['ram'] ?? '',
            $deviceInfo['disk'] ?? '',
            $deviceInfo['gpu'] ?? '',
            $deviceInfo['screen'] ?? ''
        ]);
    }
}

// Activate the key (key_code matches Prisma schema)
$stmt = $pdo->prepare('UPDATE activation_keys SET status = "active", activated_at = NOW() WHERE key_code = ?');
$stmt->execute([$key]);

// Log the action
logAction($pdo, 'activation_success', "Key: $key, Device: $deviceId, IP: $clientIP");

sendResponse(true, 'Activation successful', [
    'key' => $key,
    'status' => 'active',
    'expiryDate' => $keyData['expiry_date'],
    'deviceId' => $deviceId
]);
