<?php
// request-activation.php - Generate serial and send activation email
// Endpoint: POST /request-activation
// Auto-approves requests (serial acts as the verification token)

require_once 'config.php';

requirePostRequest();

// Rate limiting
require_once 'auth/rate-limit.php';
$rateLimiter = new RateLimit($pdo);
$clientIP = RateLimit::getClientIP();
if (!$rateLimiter->check($clientIP . '_request_activation', 5, 3600)) {
    sendResponse(false, 'Too many requests. Please try again later.', null, 429);
}

$data = readJsonRequest();
$email = strtolower(cleanInput($data['email'] ?? '', 254));
$subscriptionMonths = max(1, min(60, intval($data['months'] ?? 12)));

if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    sendResponse(false, 'Valid email is required');
}

// Verify user exists
$stmt = $pdo->prepare('SELECT id, email, role FROM users WHERE email = ?');
$stmt->execute([$email]);
$user = $stmt->fetch();

if (!$user) {
    // Don't reveal that user doesn't exist (security)
    sendResponse(true, 'If the email exists, activation details will be sent.');
}

// Generate cryptographically secure activation key
$key = generateKey();

// Calculate expiry date
$expiryDate = date('Y-m-d', strtotime("+$subscriptionMonths months"));

// Insert activation key with pending status
$stmt = $pdo->prepare('INSERT INTO activation_keys (`key`, status, expiry_date) VALUES (?, ?, ?)');
$stmt->execute([$key, 'pending', $expiryDate]);

// Generate secure serial (48 chars: 32 hex + 16 alphanumeric)
$serial = generateSerial();

// Save activation request (auto-approved)
$stmt = $pdo->prepare('INSERT INTO activation_requests (user_email, `key`, serial, status, approved_at) VALUES (?, ?, ?, ?, NOW())');
$stmt->execute([$email, $key, $serial, 'approved']);

// Send email with serial
$subject = 'Sky Wave Pro - Activation Details';
$message = "Hello,\n\nYour activation details for Sky Wave Pro:\n\n";
$message .= "Serial: $serial\n";
$message .= "Key: $key\n";
$message .= "Expiry Date: $expiryDate\n\n";
$message .= "Use this serial along with your email and password to login to the application.\n\n";
$message .= "Thank you for choosing Sky Wave Pro!";

$headers = "From: admin@skywaveads.com\r\n";
$headers .= "Reply-To: admin@skywaveads.com\r\n";
$headers .= "Content-Type: text/plain; charset=utf-8\r\n";
$headers .= "X-Mailer: PHP/" . phpversion();

// Log the action
$serialMask = substr($serial, 0, 6) . '...' . substr($serial, -6);
$keyMask = substr($key, 0, 4) . '...' . substr($key, -4);
logAction($pdo, 'activation_request', "Email: $email, Serial: $serialMask, Key: $keyMask, IP: $clientIP");

// Try to send email
$mailSent = false;
if (function_exists('mail')) {
    $mailSent = @mail($email, $subject, $message, $headers);
}

$shouldReturnDetails = strtolower(getenv('RETURN_ACTIVATION_DETAILS') ?: 'false') === 'true';
$data = [
    'expiryDate' => $expiryDate,
    'emailSent' => $mailSent
];
if ($shouldReturnDetails) {
    $data['serial'] = $serial;
    $data['key'] = $key;
}

sendResponse(true, $mailSent ? 'Activation details sent via email' : 'Activation request processed (email may be delayed)', $data);
