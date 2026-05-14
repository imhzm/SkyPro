<?php
// login.php - Login with email, password, serial, and device fingerprint
// Endpoint: POST /login
// Returns JWT token on successful authentication

require_once 'config.php';
require_once 'auth/rate-limit.php';

requirePostRequest();

// Rate limiting: max 10 attempts per 15 minutes per IP
$rateLimiter = new RateLimit($pdo);
$clientIP = RateLimit::getClientIP();
if (!$rateLimiter->check($clientIP . '_login', 10, 900)) {
    sendResponse(false, 'Too many login attempts. Please try again in 15 minutes.', null, 429);
}

$data = readJsonRequest();
$email = strtolower(cleanInput($data['email'] ?? '', 254));
$password = $data['password'] ?? '';
$serial = strtoupper(cleanInput($data['serial'] ?? '', 120));
$deviceFingerprint = cleanInput($data['deviceFingerprint'] ?? '', 160);
$deviceInfo = $data['deviceInfo'] ?? [];

if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL) || empty($password)) {
    sendResponse(false, 'Email and password are required');
}
if (!is_string($password) || strlen($password) > 512) {
    sendResponse(false, 'Invalid password');
}

if (empty($serial)) {
    sendResponse(false, 'Serial is required');
}
if (!preg_match('/^[A-Z0-9\\-]+$/', $serial)) {
    sendResponse(false, 'Invalid serial');
}

if (empty($deviceFingerprint)) {
    sendResponse(false, 'Device fingerprint is required');
}
if (!is_array($deviceInfo)) {
    $deviceInfo = [];
}

// Verify user credentials (password_hash matches Prisma schema)
$stmt = $pdo->prepare('SELECT id, email, password_hash, role, status FROM users WHERE email = ?');
$stmt->execute([$email]);
$user = $stmt->fetch();

if (!$user || !password_verify($password, $user['password_hash'])) {
    logAction($pdo, 'login_failed', "IP: $clientIP");
    sendResponse(false, 'Invalid email or password');
}

if (($user['status'] ?? 'active') !== 'active') {
    sendResponse(false, 'Account is not active', null, 403);
}

// Verify serial from activation_requests (approved or pending)
$stmt = $pdo->prepare("SELECT * FROM activation_requests WHERE serial = ? AND status IN ('approved', 'pending') ORDER BY id DESC LIMIT 1");
$stmt->execute([$serial]);
$request = $stmt->fetch();

if (!$request) {
    sendResponse(false, 'Invalid or unapproved serial');
}

// Check if serial matches the user email
if ($request['user_email'] !== $email) {
    sendResponse(false, 'Serial does not match this account');
}

// Update device fingerprint for this activation request
$stmt = $pdo->prepare('UPDATE activation_requests SET device_fingerprint = ?, approved_at = IFNULL(approved_at, NOW()) WHERE id = ?');
$stmt->execute([$deviceFingerprint, $request['id']]);

// Get the associated activation key (key_code matches Prisma schema)
$stmt = $pdo->prepare('SELECT * FROM activation_keys WHERE key_code = ?');
$stmt->execute([$request['key']]);
$keyData = $stmt->fetch();

if (!$keyData) {
    sendResponse(false, 'Activation key not found');
}

if (in_array($keyData['status'], ['revoked', 'suspended'], true)) {
    sendResponse(false, 'This activation key is not allowed');
}

if ($keyData['status'] === 'expired' || ($keyData['expires_at'] && $keyData['expires_at'] < date('Y-m-d H:i:s'))) {
    $pdo->prepare('UPDATE activation_keys SET status = "expired" WHERE key_code = ?')->execute([$request['key']]);
    sendResponse(false, 'This activation key has expired');
}

if ($keyData['status'] === 'pending') {
    $stmt = $pdo->prepare('UPDATE activation_keys SET status = "active", activated_at = NOW() WHERE key_code = ?');
    $stmt->execute([$request['key']]);
}

if (!in_array($keyData['status'], ['pending', 'active'], true)) {
    sendResponse(false, 'This activation key is not available');
}

if (!empty($deviceInfo) && !empty($deviceFingerprint)) {
    $checkStmt = $pdo->prepare('SELECT id, user_id, key_id FROM devices WHERE device_fingerprint = ?');
    $checkStmt->execute([$deviceFingerprint]);
    $existingDevice = $checkStmt->fetch();

    if ($existingDevice) {
        $updateStmt = $pdo->prepare('UPDATE devices SET last_seen_at = NOW() WHERE device_fingerprint = ?');
        $updateStmt->execute([$deviceFingerprint]);
    } else {
        $keyStmt = $pdo->prepare('SELECT user_id, id FROM activation_keys WHERE key_code = ?');
        $keyStmt->execute([$request['key']]);
        $keyInfo = $keyStmt->fetch();

        $activeCount = $pdo->prepare('SELECT COUNT(*) as cnt FROM devices WHERE key_id = ? AND is_active = 1');
        $activeCount->execute([$keyInfo['id']]);
        $count = $activeCount->fetch();
        $maxDevices = $keyInfo['max_devices'] ?? 1;
        if ($count['cnt'] >= $maxDevices) {
            sendResponse(false, "تم تجاوز الحد الأقصى للأجهزة ($maxDevices)");
        }

        $insertStmt = $pdo->prepare('INSERT INTO devices (user_id, key_id, device_fingerprint, device_name, os_info, cpu_info, ram_info, gpu_info, screen_resolution, is_active, reset_count, max_resets_per_year, first_seen_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 2, NOW(), NOW())');
        $insertStmt->execute([
            $keyInfo['user_id'] ?? null,
            $keyInfo['id'] ?? null,
            $deviceFingerprint,
            $deviceInfo['deviceName'] ?? ($deviceInfo['hostname'] ?? ''),
            $deviceInfo['os'] ?? ($deviceInfo['platform'] ?? ''),
            $deviceInfo['cpu'] ?? '',
            $deviceInfo['ram'] ?? '',
            $deviceInfo['gpu'] ?? '',
            $deviceInfo['screen'] ?? '',
        ]);
    }
}

if (in_array($keyData['status'], ['revoked', 'suspended'], true)) {
    sendResponse(false, 'This activation key is not allowed');
}

// Check if key is expired (expires_at matches Prisma schema)
if ($keyData['status'] === 'expired' || ($keyData['expires_at'] && $keyData['expires_at'] < date('Y-m-d H:i:s'))) {
    // Update status to expired
    $pdo->prepare('UPDATE activation_keys SET status = "expired" WHERE key_code = ?')->execute([$request['key']]);
    sendResponse(false, 'This activation key has expired');
}

// Activate the key if pending
if ($keyData['status'] === 'pending') {
    $stmt = $pdo->prepare('UPDATE activation_keys SET status = "active", activated_at = NOW() WHERE key_code = ?');
    $stmt->execute([$request['key']]);
}

if (!in_array($keyData['status'], ['pending', 'active'], true)) {
    sendResponse(false, 'This activation key is not available');
}

// Save/update device info (matches Prisma schema)
if (!empty($deviceInfo) && !empty($deviceFingerprint)) {
    $checkStmt = $pdo->prepare('SELECT id, user_id, key_id FROM devices WHERE device_fingerprint = ?');
    $checkStmt->execute([$deviceFingerprint]);
    $existingDevice = $checkStmt->fetch();

    if ($existingDevice) {
        $updateStmt = $pdo->prepare('UPDATE devices SET last_seen_at = NOW() WHERE device_fingerprint = ?');
        $updateStmt->execute([$deviceFingerprint]);
    } else {
        // Get user_id and key_id from activation key
        $keyStmt = $pdo->prepare('SELECT user_id, id FROM activation_keys WHERE key_code = ?');
        $keyStmt->execute([$request['key']]);
        $keyInfo = $keyStmt->fetch();

        $insertStmt = $pdo->prepare('INSERT INTO devices (user_id, key_id, device_fingerprint, device_name, os_info, cpu_info, ram_info, disk_info, gpu_info, screen_resolution, is_active, reset_count, max_resets_per_year, first_seen_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 2, NOW(), NOW())');
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
            $deviceInfo['screen'] ?? '',
        ]);
    }
}

// Generate JWT token
$token = JWT::encode([
    'email' => $user['email'],
    'role' => $user['role'],
    'key' => $request['key'],
    'deviceId' => $deviceFingerprint
], 86400 * 30); // 30 days

// Log successful login
logAction($pdo, 'login_success', "Key: $key, IP: $clientIP");

sendResponse(true, 'Login successful', [
    'token' => $token,
    'email' => $user['email'],
    'role' => $user['role'],
    'key' => $request['key'],
    'status' => 'active',
    'expiryDate' => $keyData['expires_at'],
    'deviceId' => $deviceFingerprint
]);
