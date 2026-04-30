<?php
// validate.php - Validate a key

require_once 'config.php';

$data = json_decode(file_get_contents('php://input'), true);
$key = $data['key'] ?? '';
$deviceId = $data['deviceId'] ?? '';

if (empty($key)) {
    sendResponse(false, 'Key is required');
}

$stmt = $pdo->prepare("SELECT * FROM activation_keys WHERE `key` = ?");
$stmt->execute([$key]);
$keyData = $stmt->fetch();

if (!$keyData) {
    sendResponse(false, 'Invalid activation key');
}

if ($keyData['status'] === 'expired') {
    sendResponse(false, 'This key has expired');
}

// Check if device matches (if already activated)
if ($keyData['status'] === 'active' && $keyData['device_id'] && $keyData['device_id'] !== $deviceId) {
    sendResponse(false, 'This key is already activated on another device');
}

sendResponse(true, 'Key is valid', [
    'key' => $key,
    'status' => $keyData['status'],
    'expiryDate' => $keyData['expiry_date'],
    'deviceId' => $keyData['device_id']
]);
