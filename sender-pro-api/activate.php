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

// Check if key exists
$stmt = $pdo->prepare('SELECT * FROM activation_keys WHERE `key` = ?');
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

// Save/update device info
if (!empty($deviceInfo) && !empty($deviceId)) {
    $checkStmt = $pdo->prepare('SELECT id, first_activation_key FROM devices WHERE fingerprint = ?');
    $checkStmt->execute([$deviceId]);
    $existingDevice = $checkStmt->fetch();

    if ($existingDevice) {
        $updateStmt = $pdo->prepare('UPDATE devices SET last_seen = NOW() WHERE fingerprint = ?');
        $updateStmt->execute([$deviceId]);
    } else {
        $insertStmt = $pdo->prepare('INSERT INTO devices (fingerprint, hostname, platform, arch, cpu, cpu_cores, ram, first_activation_key, first_activated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())');
        $insertStmt->execute([
            $deviceId,
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

// Activate the key
$stmt = $pdo->prepare('UPDATE activation_keys SET status = "active", device_id = ?, activated_at = NOW() WHERE `key` = ?');
$stmt->execute([$deviceId, $key]);

// Log the action
logAction($pdo, 'activation_success', "Key: $key, Device: $deviceId, IP: $clientIP");

sendResponse(true, 'Activation successful', [
    'key' => $key,
    'status' => 'active',
    'expiryDate' => $keyData['expiry_date'],
    'deviceId' => $deviceId
]);
