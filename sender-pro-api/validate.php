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

if ($keyData['status'] === 'expired' || ($keyData['expiry_date'] && $keyData['expiry_date'] < date('Y-m-d'))) {
    if ($keyData['status'] !== 'expired') {
        $pdo->prepare('UPDATE activation_keys SET status = "expired" WHERE key_code = ?')->execute([$key]);
    }
    logAction($pdo, 'validation_failed', "Key expired: $key, IP: $clientIP");
    sendResponse(false, 'This key has expired');
}

// Check if device matches (if already activated)
if ($keyData['status'] === 'active' && $keyData['device_id'] && $keyData['device_id'] !== $deviceId) {
    logAction($pdo, 'validation_failed', "Device mismatch for key: $key, Expected: {$keyData['device_id']}, Got: $deviceId, IP: $clientIP");
    sendResponse(false, 'This key is already activated on another device');
}

// Validate device info sub-field lengths
foreach (['hostname', 'platform', 'arch', 'cpu', 'cpuCores', 'ram'] as $field) {
    if (isset($deviceInfo[$field]) && is_string($deviceInfo[$field])) {
        $deviceInfo[$field] = cleanInput($deviceInfo[$field], 255);
    }
}

// Save/update device info if provided
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

// Log successful validation
logAction($pdo, 'validation_success', "Key: $key, Device: $deviceId, IP: $clientIP");

sendResponse(true, 'Key is valid', [
    'key' => $key,
    'status' => $keyData['status'],
    'expiryDate' => $keyData['expiry_date'],
    'deviceId' => $keyData['device_id']
]);
