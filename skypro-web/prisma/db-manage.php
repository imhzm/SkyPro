<?php

$confirm = getenv('CONFIRM_CLEAN_DB');
if ($confirm !== 'DELETE_ALL_NON_ADMIN_DATA') {
    fwrite(STDERR, "Refusing to clean database. Set CONFIRM_CLEAN_DB=DELETE_ALL_NON_ADMIN_DATA to continue.\n");
    exit(1);
}

$host = getenv('DB_HOST') ?: '127.0.0.1';
$dbname = getenv('DB_NAME') ?: 'skypro';
$username = getenv('DB_USER');
$password = getenv('DB_PASSWORD');
$adminEmail = getenv('ADMIN_EMAIL') ?: 'admin@skywaveads.com';
$adminPassword = getenv('ADMIN_PASSWORD');
$createTestUser = getenv('CREATE_TEST_USER') === '1';
$testPassword = getenv('TEST_USER_PASSWORD');

if (!$username || !$password) {
    fwrite(STDERR, "Set DB_USER and DB_PASSWORD before running this script.\n");
    exit(1);
}

if (!$adminPassword || strlen($adminPassword) < 12) {
    fwrite(STDERR, "Set ADMIN_PASSWORD to a strong password with at least 12 characters.\n");
    exit(1);
}

if ($createTestUser && (!$testPassword || strlen($testPassword) < 12)) {
    fwrite(STDERR, "Set TEST_USER_PASSWORD to a strong password with at least 12 characters.\n");
    exit(1);
}

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $pdo->beginTransaction();

    $tables = [
        'audit_log',
        'devices',
        'subscriptions',
        'activation_keys',
        'nextauth_sessions',
        'accounts',
        'verification_tokens',
    ];

    foreach ($tables as $table) {
        $pdo->exec("DELETE FROM `$table`");
    }

    $pdo->exec('DELETE FROM users');

    $stmt = $pdo->prepare('INSERT INTO users (email, password_hash, name, role, status, email_verified_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW(), NOW())');
    $stmt->execute([
        $adminEmail,
        password_hash($adminPassword, PASSWORD_DEFAULT),
        'Admin',
        'admin',
        'active',
    ]);

    if ($createTestUser) {
        $stmt->execute([
            'test@skywaveads.com',
            password_hash($testPassword, PASSWORD_DEFAULT),
            'Test User',
            'user',
            'active',
        ]);
    }

    $pdo->commit();
    echo "Database cleanup completed. Admin kept: {$adminEmail}\n";
} catch (PDOException $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    fwrite(STDERR, "Error: " . $e->getMessage() . "\n");
    exit(1);
}
