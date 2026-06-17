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

// Expiry check (expires_at matches the unified schema)
if (keyIsExpired($keyData)) {
    markKeyExpired($pdo, $request['key']);
    sendResponse(false, 'This activation key has expired');
}

if (!in_array($keyData['status'], ['pending', 'active', 'available'], true)) {
    sendResponse(false, 'This activation key is not available');
}

// Validate device info sub-field lengths
foreach (['deviceName', 'hostname', 'os', 'platform', 'cpu', 'ram', 'disk', 'gpu', 'screen'] as $field) {
    if (isset($deviceInfo[$field]) && is_string($deviceInfo[$field])) {
        $deviceInfo[$field] = cleanInput($deviceInfo[$field], 255);
    }
}

// Bind / refresh this device (canonical upsert, enforces max_devices)
if (!empty($deviceFingerprint)) {
    [$ok, $message] = upsertKeyDevice($pdo, $keyData, $deviceFingerprint, $deviceInfo);
    if (!$ok) {
        sendResponse(false, $message);
    }
}

// Activate the key if it was pending/available; stamp expiry on first use
if (in_array($keyData['status'], ['pending', 'available'], true)) {
    $stmt = $pdo->prepare('UPDATE activation_keys SET status = "active", activated_at = COALESCE(activated_at, NOW()), expires_at = COALESCE(expires_at, DATE_ADD(NOW(), INTERVAL duration_days DAY)) WHERE key_code = ?');
    $stmt->execute([$request['key']]);
    $stmt = $pdo->prepare('SELECT expires_at FROM activation_keys WHERE key_code = ?');
    $stmt->execute([$request['key']]);
    $refreshed = $stmt->fetch();
    $keyData['expires_at'] = $refreshed['expires_at'] ?? $keyData['expires_at'];
}

// Generate JWT token
$token = JWT::encode([
    'email' => $user['email'],
    'role' => $user['role'],
    'key' => $request['key'],
    'deviceId' => $deviceFingerprint
], 86400 * 30); // 30 days

// Log successful login
logAction($pdo, 'login_success', "Key: {$request['key']}, IP: $clientIP");

sendResponse(true, 'Login successful', [
    'token' => $token,
    'email' => $user['email'],
    'role' => $user['role'],
    'key' => $request['key'],
    'status' => 'active',
    'expiryDate' => $keyData['expires_at'],
    'deviceId' => $deviceFingerprint
]);
