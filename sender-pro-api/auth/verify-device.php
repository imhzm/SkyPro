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

// Check if key exists
$stmt = $pdo->prepare('SELECT * FROM activation_keys WHERE `key` = ?');
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

// Save/update device info
if (!empty($deviceInfo)) {
    $checkStmt = $pdo->prepare('SELECT id, first_activation_key FROM devices WHERE fingerprint = ?');
    $checkStmt->execute([$deviceFingerprint]);
    $existingDevice = $checkStmt->fetch();

    if ($existingDevice) {
        $updateStmt = $pdo->prepare('UPDATE devices SET last_seen = NOW() WHERE fingerprint = ?');
        $updateStmt->execute([$deviceFingerprint]);
    } else {
        $insertStmt = $pdo->prepare('INSERT INTO devices (fingerprint, hostname, platform, arch, cpu, cpu_cores, ram, first_activation_key, first_activated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())');
        $insertStmt->execute([
            $deviceFingerprint,
            $deviceInfo['hostname'] ?? '',
            $deviceInfo['platform'] ?? '',
            $deviceInfo['arch'] ?? '',
            $deviceInfo['cpu'] ?? '',
            $deviceInfo['cpuCores'] ?? 0,
            $deviceInfo['ram'] ?? '',
            $key
        ]);
    }
}

// If key is pending, activate it
if ($keyData['status'] === 'pending') {
    $stmt = $pdo->prepare('UPDATE activation_keys SET status = "active", device_id = ?, activated_at = NOW() WHERE `key` = ?');
    $stmt->execute([$deviceFingerprint, $key]);
}

if (!in_array($keyData['status'], ['pending', 'active'], true)) {
    sendResponse(false, 'This key is not available');
}

// Log the action
logAction($pdo, 'device_verified', "Key: $key, Device: $deviceFingerprint, IP: $clientIP");

// Return success
sendResponse(true, 'Device verified successfully', [
    'key' => $key,
    'status' => 'active',
    'expiryDate' => $keyData['expiry_date'],
    'deviceId' => $deviceFingerprint
]);
