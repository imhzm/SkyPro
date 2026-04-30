<?php
// status.php - Check key status

require_once 'config.php';

$key = $_GET['key'] ?? '';

if (empty($key)) {
    sendResponse(false, 'Key is required');
}

$stmt = $pdo->prepare("SELECT * FROM activation_keys WHERE `key` = ?");
$stmt->execute([$key]);
$keyData = $stmt->fetch();

if (!$keyData) {
    sendResponse(false, 'Invalid activation key');
}

sendResponse(true, 'Status retrieved', [
    'key' => $key,
    'status' => $keyData['status'],
    'expiryDate' => $keyData['expiry_date'],
    'deviceId' => $keyData['device_id'],
    'activatedAt' => $keyData['activated_at']
]);
