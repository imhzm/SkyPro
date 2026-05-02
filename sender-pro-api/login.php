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

// Verify user credentials
$stmt = $pdo->prepare('SELECT * FROM users WHERE email = ?');
$stmt->execute([$email]);
$user = $stmt->fetch();

if (!$user || !password_verify($password, $user['password'])) {
    logAction($pdo, 'login_failed', "Email: $email, IP: $clientIP");
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

// Get the associated activation key
$stmt = $pdo->prepare('SELECT * FROM activation_keys WHERE `key` = ?');
$stmt->execute([$request['key']]);
$keyData = $stmt->fetch();

if (!$keyData) {
    sendResponse(false, 'Activation key not found');
}

if (in_array($keyData['status'], ['revoked', 'suspended'], true)) {
    sendResponse(false, 'This activation key is not allowed');
}

// Check if key is expired
if ($keyData['status'] === 'expired' || ($keyData['expiry_date'] && $keyData['expiry_date'] < date('Y-m-d'))) {
    // Update status to expired
    $pdo->prepare('UPDATE activation_keys SET status = "expired" WHERE `key` = ?')->execute([$request['key']]);
    sendResponse(false, 'This activation key has expired');
}

// Activate the key if pending
if ($keyData['status'] === 'pending') {
    $stmt = $pdo->prepare('UPDATE activation_keys SET status = "active", device_id = ?, activated_at = NOW() WHERE `key` = ?');
    $stmt->execute([$deviceFingerprint, $request['key']]);
}

if (!in_array($keyData['status'], ['pending', 'active'], true)) {
    sendResponse(false, 'This activation key is not available');
}

// Save/update device info
if (!empty($deviceInfo) && !empty($deviceFingerprint)) {
    $checkStmt = $pdo->prepare('SELECT id FROM devices WHERE fingerprint = ?');
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
            $request['key']
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
logAction($pdo, 'login_success', "Email: $email, Key: {$request['key']}, IP: $clientIP");

sendResponse(true, 'Login successful', [
    'token' => $token,
    'email' => $user['email'],
    'role' => $user['role'],
    'key' => $request['key'],
    'status' => 'active',
    'expiryDate' => $keyData['expiry_date'],
    'deviceId' => $deviceFingerprint
]);
