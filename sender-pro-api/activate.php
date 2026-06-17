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
if (!RateLimit::isValidDeviceId($deviceId)) {
    sendResponse(false, 'Invalid device fingerprint');
}
if (!is_array($deviceInfo)) {
    $deviceInfo = [];
}

// Validate device info sub-field lengths
foreach (['deviceName', 'hostname', 'os', 'platform', 'cpu', 'ram', 'disk', 'gpu', 'screen'] as $field) {
    if (isset($deviceInfo[$field]) && is_string($deviceInfo[$field])) {
        $deviceInfo[$field] = cleanInput($deviceInfo[$field], 255);
    }
}

// Use transaction + FOR UPDATE to prevent race condition (double activation)
$pdo->beginTransaction();
try {
    $stmt = $pdo->prepare('SELECT * FROM activation_keys WHERE key_code = ? FOR UPDATE');
    $stmt->execute([$key]);
    $keyData = $stmt->fetch();

    if (!$keyData) {
        $pdo->rollBack();
        sendResponse(false, 'Invalid activation key');
    }

    if (keyIsExpired($keyData)) {
        $pdo->rollBack();
        markKeyExpired($pdo, $key);
        sendResponse(false, 'This key has expired');
    }

    if (in_array($keyData['status'], ['revoked', 'suspended'], true)) {
        $pdo->rollBack();
        sendResponse(false, 'This activation key is not allowed');
    }

    // If the key is bound to a user account, require a matching authenticated
    // caller so a leaked key string alone cannot be claimed by a stranger.
    if (!empty($keyData['user_id'])) {
        $token = JWT::getBearerToken();
        $payload = $token ? JWT::decode($token) : null;
        $ownerStmt = $pdo->prepare('SELECT email FROM users WHERE id = ?');
        $ownerStmt->execute([$keyData['user_id']]);
        $owner = $ownerStmt->fetch();
        $ownerEmail = strtolower($owner['email'] ?? '');
        $callerEmail = strtolower($payload['email'] ?? '');
        if (!$payload || $callerEmail === '' || $callerEmail !== $ownerEmail) {
            $pdo->rollBack();
            sendResponse(false, 'Authentication required to activate this key', null, 401);
        }
    }

    // Device binding is enforced via the `devices` table + max_devices.
    if ($keyData['status'] === 'active' && isBoundToAnotherDevice($pdo, $keyData, $deviceId)) {
        $pdo->rollBack();
        sendResponse(false, 'This key is already activated on another device');
    }

    // Save/update device info (canonical upsert, enforces max_devices)
    [$ok, $message] = upsertKeyDevice($pdo, $keyData, $deviceId, $deviceInfo);
    if (!$ok) {
        $pdo->rollBack();
        sendResponse(false, $message);
    }

    // Activate the key. There is no device_id column on activation_keys —
    // binding lives in `devices`. Stamp activated_at + expires_at on first use.
    $stmt = $pdo->prepare('UPDATE activation_keys SET status = "active", activated_at = COALESCE(activated_at, NOW()), expires_at = COALESCE(expires_at, DATE_ADD(NOW(), INTERVAL duration_days DAY)) WHERE key_code = ?');
    $stmt->execute([$key]);

    // Re-read to return the freshly-stamped expiry
    $stmt = $pdo->prepare('SELECT expires_at FROM activation_keys WHERE key_code = ?');
    $stmt->execute([$key]);
    $updated = $stmt->fetch();

    $pdo->commit();
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    sendResponse(false, 'Activation failed', null, 500);
}

// Log the action
logAction($pdo, 'activation_success', "Key: $key, Device: $deviceId, IP: $clientIP");

sendResponse(true, 'Activation successful', [
    'key' => $key,
    'status' => 'active',
    'expiryDate' => $updated['expires_at'] ?? null,
    'deviceId' => $deviceId
]);
