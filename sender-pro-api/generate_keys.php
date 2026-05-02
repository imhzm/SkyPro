<?php
// generate_keys.php - Generate new activation keys (Admin only)

require_once 'config.php';

requirePostRequest();

$expectedAdminKey = getenv('ADMIN_API_KEY') ?: '';
if ($expectedAdminKey === '' || strlen($expectedAdminKey) < 24) {
    sendResponse(false, 'Server is not configured: invalid ADMIN_API_KEY', null, 500);
}

$providedAdminKey = '';
$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
if (preg_match('/^Bearer\s+(.+)$/i', $authHeader, $matches) === 1) {
    $providedAdminKey = trim($matches[1]);
}
if ($providedAdminKey === '' && isset($_SERVER['HTTP_X_ADMIN_KEY'])) {
    $providedAdminKey = trim($_SERVER['HTTP_X_ADMIN_KEY']);
}

if ($providedAdminKey === '' || !hash_equals($expectedAdminKey, $providedAdminKey)) {
    sendResponse(false, 'Unauthorized', null, 401);
}

$input = readJsonRequest(4096);
$count = intval($input['count'] ?? 10);
$expiryDate = cleanInput($input['expiry'] ?? date('Y-m-d', strtotime('+1 year')), 32);

if ($count < 1 || $count > 200) {
    sendResponse(false, 'Count must be between 1 and 200', null, 400);
}

$parsedExpiry = strtotime($expiryDate);
if ($parsedExpiry === false) {
    sendResponse(false, 'Invalid expiry date format', null, 400);
}
$expiryDate = date('Y-m-d', $parsedExpiry);

$generated = [];

for ($i = 0; $i < $count; $i++) {
    $key = generateKey();
    
    try {
        $stmt = $pdo->prepare("INSERT INTO activation_keys (`key`, expiry_date) VALUES (?, ?)");
        $stmt->execute([$key, $expiryDate]);
        $generated[] = $key;
    } catch (PDOException $e) {
        // Key already exists, try again
        $i--;
    }
}

sendResponse(true, "Generated {$count} keys", [
    'keys' => $generated,
    'expiryDate' => $expiryDate
]);
