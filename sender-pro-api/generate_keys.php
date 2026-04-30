<?php
// generate_keys.php - Generate new activation keys (Admin only)

require_once 'config.php';

// Simple protection - add your own auth
$adminKey = $_GET['admin'] ?? '';
if ($adminKey !== 'your_admin_secret_key') {
    sendResponse(false, 'Unauthorized');
}

$count = intval($_GET['count'] ?? 10);
$expiryDate = $_GET['expiry'] ?? date('Y-m-d', strtotime('+1 year'));

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
