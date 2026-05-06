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

// Check if key is expired
if ($keyData['status'] === 'expired' || ($keyData['expiry_date'] && $keyData['expiry_date'] < date('Y-m-d'))) {
    if ($keyData['status'] !== 'expired') {
        $pdo->prepare('UPDATE activation_keys SET status = "expired" WHERE `key` = ?')->execute([$key]);
    }
    sendResponse(false, 'This key has expired');
}

// Check if key is already activated on another device
if ($keyData['status'] === 'active' && !empty($keyData['device_id']) && $keyData['device_id'] !== $deviceFingerprint) {
    sendResponse(false, 'This key is already activated on another device');
}

// Save/update device info (matches Prisma schema)
if (!empty($deviceInfo)) {
    $checkStmt = $pdo->prepare('SELECT id, user_id, key_id FROM devices WHERE device_fingerprint = ?');
    $checkStmt->execute([$deviceFingerprint]);
    $existingDevice = $checkStmt->fetch();

    if ($existingDevice) {
        $updateStmt = $pdo->prepare('UPDATE devices SET last_seen_at = NOW() WHERE device_fingerprint = ?');
        $updateStmt->execute([$deviceFingerprint]);
    } else {
        // Get user_id and key_id from activation key
        $keyStmt = $pdo->prepare('SELECT user_id, id FROM activation_keys WHERE key_code = ?');
        $keyStmt->execute([$key]);
        $keyInfo = $keyStmt->fetch();

        $insertStmt = $pdo->prepare('INSERT INTO devices (user_id, key_id, device_fingerprint, device_name, os_info, cpu_info, ram_info, disk_info, gpu_info, screen_resolution, is_active, reset_count, max_resets_per_year, first_seen_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 2, NOW(), NOW())');
        $insertStmt->execute([
            $keyInfo['user_id'] ?? null,
            $keyInfo['id'] ?? null,
            $deviceFingerprint,
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

// If key is pending, activate it (key_code matches Prisma)
if ($keyData['status'] === 'pending') {
    $stmt = $pdo->prepare('UPDATE activation_keys SET status = "active", activated_at = NOW() WHERE key_code = ?');
    $stmt->execute([$key]);
}

if (!in_array($keyData['status'], ['pending', 'active'], true)) {
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
