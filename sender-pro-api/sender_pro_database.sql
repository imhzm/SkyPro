-- sender_pro_database.sql
-- Unified with Prisma schema (Web/Next.js is the correct reference)
-- Run this in your Hostinger MySQL database
-- For production, run: mysql -u root -p senderpro < sender_pro_database.sql

CREATE DATABASE IF NOT EXISTS senderpro CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE senderpro;

-- ============================================
-- USERS TABLE (Updated to match Prisma)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) DEFAULT NULL,
    avatar_url VARCHAR(500) DEFAULT NULL,
    role ENUM('user', 'admin') DEFAULT 'user',
    status ENUM('active', 'suspended', 'deleted') DEFAULT 'active',
    email_verified_at DATETIME DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- ACCOUNTS TABLE (NextAuth - from Prisma)
-- ============================================
CREATE TABLE IF NOT EXISTS accounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type VARCHAR(50) NOT NULL,
    provider VARCHAR(100) NOT NULL,
    provider_account_id VARCHAR(255) NOT NULL,
    refresh_token TEXT DEFAULT NULL,
    access_token TEXT DEFAULT NULL,
    expires_at INT DEFAULT NULL,
    token_type VARCHAR(100) DEFAULT NULL,
    scope TEXT DEFAULT NULL,
    id_token TEXT DEFAULT NULL,
    session_state TEXT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_provider_account (provider, provider_account_id),
    INDEX idx_user_id (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- ACTIVATION KEYS TABLE (Updated to match Prisma)
-- ============================================
CREATE TABLE IF NOT EXISTS activation_keys (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT DEFAULT NULL,
    key_code VARCHAR(40) UNIQUE NOT NULL,
    status ENUM('available', 'pending', 'active', 'expired', 'suspended', 'revoked') DEFAULT 'pending',
    plan VARCHAR(50) DEFAULT 'pro',
    duration_days INT DEFAULT 365,
    max_devices INT DEFAULT 1,
    activated_at DATETIME DEFAULT NULL,
    expires_at DATETIME DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_key_code (key_code),
    INDEX idx_status (status),
    INDEX idx_user_id (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- DEVICES TABLE (Updated to match Prisma schema)
-- ============================================
CREATE TABLE IF NOT EXISTS devices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    key_id INT NOT NULL,
    device_fingerprint VARCHAR(255) UNIQUE NOT NULL,
    device_name VARCHAR(255) DEFAULT NULL,
    os_info VARCHAR(255) DEFAULT NULL,
    cpu_info VARCHAR(200) DEFAULT NULL,
    ram_info VARCHAR(50) DEFAULT NULL,
    disk_info VARCHAR(100) DEFAULT NULL,
    gpu_info VARCHAR(100) DEFAULT NULL,
    screen_resolution VARCHAR(50) DEFAULT NULL,
    is_active TINYINT(1) DEFAULT 1,
    reset_count INT DEFAULT 0,
    max_resets_per_year INT DEFAULT 2,
    first_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_fingerprint_key (device_fingerprint, key_id),
    INDEX idx_user_id (user_id),
    INDEX idx_key_id (key_id),
    INDEX idx_fingerprint (device_fingerprint),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (key_id) REFERENCES activation_keys(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- SUBSCRIPTIONS TABLE (From Prisma - missing in old PHP API)
-- ============================================
CREATE TABLE IF NOT EXISTS subscriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    key_id INT UNIQUE DEFAULT NULL,
    status ENUM('trial', 'active', 'expired', 'cancelled', 'suspended') DEFAULT 'trial',
    trial_ends_at DATETIME DEFAULT NULL,
    started_at DATETIME DEFAULT NULL,
    expires_at DATETIME DEFAULT NULL,
    auto_renew TINYINT(1) DEFAULT 0,
    payment_method VARCHAR(100) DEFAULT NULL,
    amount DECIMAL(10,2) DEFAULT NULL,
    currency VARCHAR(10) DEFAULT 'EGP',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_key_id (key_id),
    INDEX idx_status (status),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (key_id) REFERENCES activation_keys(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- INVOICES TABLE (From Prisma - missing in old PHP API)
-- ============================================
CREATE TABLE IF NOT EXISTS invoices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    subscription_id INT DEFAULT NULL,
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    status ENUM('draft', 'issued', 'paid', 'overdue', 'cancelled') DEFAULT 'draft',
    subtotal DECIMAL(10,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'EGP',
    due_date DATETIME DEFAULT NULL,
    paid_at DATETIME DEFAULT NULL,
    notes TEXT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_subscription_id (subscription_id),
    INDEX idx_status (status),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- PAYMENTS TABLE (From Prisma - missing in old PHP API)
-- ============================================
CREATE TABLE IF NOT EXISTS payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT DEFAULT NULL,
    subscription_id INT DEFAULT NULL,
    invoice_id INT DEFAULT NULL,
    provider VARCHAR(100) DEFAULT NULL,
    provider_ref VARCHAR(255) DEFAULT NULL,
    status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending',
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'EGP',
    method VARCHAR(50) DEFAULT NULL,
    paid_at DATETIME DEFAULT NULL,
    metadata JSON DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_subscription_id (subscription_id),
    INDEX idx_invoice_id (invoice_id),
    INDEX idx_status (status),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- AUDIT LOG TABLE (From Prisma - missing in old PHP API)
-- ============================================
CREATE TABLE IF NOT EXISTS audit_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT DEFAULT NULL,
    action VARCHAR(100) NOT NULL,
    details JSON DEFAULT NULL,
    ip_address VARCHAR(45) DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_action (action),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- SYSTEM SETTINGS TABLE (From Prisma - missing in old PHP API)
-- ============================================
CREATE TABLE IF NOT EXISTS system_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT DEFAULT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- VERIFICATION TOKENS TABLE (From Prisma - missing in old PHP API)
-- ============================================
CREATE TABLE IF NOT EXISTS verification_tokens (
    identifier VARCHAR(255) NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires DATETIME NOT NULL,
    UNIQUE KEY uk_identifier_token (identifier, token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- ACTIVATION REQUESTS TABLE (Keep from old schema)
-- ============================================
CREATE TABLE IF NOT EXISTS activation_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    `key` VARCHAR(20) NOT NULL,
    serial VARCHAR(100) NOT NULL,
    device_fingerprint VARCHAR(255) DEFAULT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    approved_at DATETIME DEFAULT NULL,
    INDEX idx_serial (serial),
    INDEX idx_email (user_email),
    UNIQUE KEY uk_serial (serial)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- RATE LIMITS TABLE (Fixed: MEMORY -> InnoDB)
-- ============================================
CREATE TABLE IF NOT EXISTS rate_limits (
    id INT AUTO_INCREMENT PRIMARY KEY,
    identifier VARCHAR(255) NOT NULL,
    endpoint VARCHAR(100) NOT NULL,
    request_time INT NOT NULL,
    INDEX idx_identifier (identifier),
    INDEX idx_time (request_time)
) ENGINE=InnoDB;

-- ============================================
-- APP LOGS TABLE (Keep from old schema)
-- ============================================
CREATE TABLE IF NOT EXISTS app_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    action VARCHAR(100) NOT NULL,
    details TEXT,
    ip_address VARCHAR(45),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- SETUP INSTRUCTIONS (run these manually):
-- ============================================
-- 1. Set proper admin password (REPLACE WITH REAL HASH):
--    php -r "echo password_hash('<choose-strong-admin-password>', PASSWORD_DEFAULT);"
--    Then: UPDATE users SET password_hash = '<paste_hash_here>' WHERE email = 'admin@skywaveads.com';

-- 2. Verify tables:
--    SHOW TABLES;

-- 3. Create .env file from .env.example and set JWT_SECRET:
--    openssl rand -hex 32

-- 4. Run Prisma migration to sync:
--    cd skypro-web && npx prisma migrate dev --name unify_schema
