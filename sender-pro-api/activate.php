<?php
// activate.php - Activate a key

require_once 'config.php';

$data = json_decode(file_get_contents('php://input'), true);
$key = $data['key'] ?? '';
$deviceId = $data['deviceId'] ?? '';

if (empty($key) || empty($deviceId)) {
    sendResponse(false, 'Key and device ID are required');
}

// Check if key exists
$stmt = $pdo->prepare("SELECT * FROM activation_keys WHERE `key` = ?");
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

// Activate the key
$stmt = $pdo->prepare("UPDATE activation_keys SET status = 'active', device_id = ?, activated_at = NOW() WHERE `key` = ?");
$stmt->execute([$deviceId, $key]);

sendResponse(true, 'Activation successful', [
    'key' => $key,
    'status' => 'active',
    'expiryDate' => $keyData['expiry_date'],
    'deviceId' => $deviceId
]);
