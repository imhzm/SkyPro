-- sender_pro_database.sql
-- Run this in your Hostinger MySQL database
-- For production, run: mysql -u root -p senderpro < sender_pro_database.sql

CREATE DATABASE IF NOT EXISTS senderpro CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE senderpro;

-- Users table - admin and customers
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'customer') DEFAULT 'customer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- IMPORTANT: Do not commit or ship a real admin password in this file.
-- 1. Generate a hash locally:
--    php -r "echo password_hash('<choose-strong-admin-password>', PASSWORD_DEFAULT);"
-- 2. Then run a one-off insert/update with the generated hash:
--    INSERT INTO users (email, password, role) VALUES ('admin@skywaveads.com', '<generated_hash>', 'admin')
--    ON DUPLICATE KEY UPDATE password = VALUES(password), role = 'admin';

-- Activation keys table
CREATE TABLE IF NOT EXISTS activation_keys (
    id INT AUTO_INCREMENT PRIMARY KEY,
    `key` VARCHAR(20) UNIQUE NOT NULL,
    status ENUM('pending', 'active', 'expired', 'invalid') DEFAULT 'pending',
    device_id VARCHAR(100) DEFAULT NULL,
    expiry_date DATE NOT NULL,
    activated_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_key (`key`),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- App logs table
CREATE TABLE IF NOT EXISTS app_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    action VARCHAR(100) NOT NULL,
    details TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Devices table - stores device info on activation
CREATE TABLE IF NOT EXISTS devices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fingerprint VARCHAR(100) UNIQUE NOT NULL,
    hostname VARCHAR(100),
    platform VARCHAR(50),
    arch VARCHAR(50),
    cpu VARCHAR(200),
    cpu_cores INT DEFAULT 0,
    ram VARCHAR(50),
    first_activation_key VARCHAR(20),
    first_activated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_fingerprint (fingerprint)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Activation requests table - stores serial + device fingerprint for email verification
-- NOTE: serial is UNIQUE to prevent duplicate serials
CREATE TABLE IF NOT EXISTS activation_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    `key` VARCHAR(20) NOT NULL,
    serial VARCHAR(100) NOT NULL,
    device_fingerprint VARCHAR(100) DEFAULT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'approved',
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP NULL,
    INDEX idx_serial (serial),
    INDEX idx_email (user_email),
    UNIQUE KEY uk_serial (serial)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Rate limits table (for rate limiting)
CREATE TABLE IF NOT EXISTS rate_limits (
    id INT AUTO_INCREMENT PRIMARY KEY,
    identifier VARCHAR(255) NOT NULL,
    endpoint VARCHAR(100) NOT NULL,
    request_time INT NOT NULL,
    INDEX idx_identifier (identifier),
    INDEX idx_time (request_time)
) ENGINE=MEMORY;

-- ============================================
-- SETUP INSTRUCTIONS (run these manually):
-- ============================================
-- 1. Set proper admin password (REPLACE WITH REAL HASH):
--    php -r "echo password_hash('<choose-strong-admin-password>', PASSWORD_DEFAULT);"
--    Then: UPDATE users SET password = '<paste_hash_here>' WHERE email = 'admin@skywaveads.com';

-- 2. Verify tables:
--    SHOW TABLES;

-- 3. Create .env file from .env.example and set JWT_SECRET:
--    openssl rand -hex 32
