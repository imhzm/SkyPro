<?php
// request-activation.php - Create a pending activation request
// Endpoint: POST /request-activation
// Public requests never create or return activation credentials.

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
    sendResponse(true, 'If the email exists, an activation request will be recorded.');
}

// Calculate requested expiry date. Admin approval is responsible for issuing a real key.
$expiryDate = date('Y-m-d', strtotime("+$subscriptionMonths months"));

// Store a request reference only. This is not an activation serial and cannot be redeemed.
$requestRef = 'REQ-' . strtoupper(bin2hex(random_bytes(8)));
$pendingKeyMarker = 'PENDING-REQUEST';

$stmt = $pdo->prepare('INSERT INTO activation_requests (user_email, `key`, serial, status, approved_at) VALUES (?, ?, ?, ?, NULL)');
$stmt->execute([$email, $pendingKeyMarker, $requestRef, 'pending']);

$subject = 'Sky Wave Pro - Activation Request Received';
$message = "Hello,\n\nWe received your Sky Wave Pro activation request.\n\n";
$message .= "Request reference: $requestRef\n";
$message .= "Requested expiry date: $expiryDate\n\n";
$message .= "An administrator must approve the request before any activation key is issued.\n\n";
$message .= "Thank you for choosing Sky Wave Pro!";

$headers = "From: admin@skywaveads.com\r\n";
$headers .= "Reply-To: admin@skywaveads.com\r\n";
$headers .= "Content-Type: text/plain; charset=utf-8\r\n";
$headers .= "X-Mailer: PHP/" . phpversion();

logAction($pdo, 'activation_request_pending', "Email: $email, Request: $requestRef, IP: $clientIP");

// Try to send email
$mailSent = false;
if (function_exists('mail')) {
    $mailSent = @mail($email, $subject, $message, $headers);
}

$data = [
    'requestReference' => $requestRef,
    'expiryDate' => $expiryDate,
    'emailSent' => $mailSent
];

sendResponse(true, $mailSent ? 'Activation request received' : 'Activation request received (email may be delayed)', $data);
