-- sender_pro_database.sql
-- Run this in your Hostinger MySQL database

CREATE DATABASE IF NOT EXISTS senderpro CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE senderpro;

CREATE TABLE IF NOT EXISTS activation_keys (
    id INT AUTO_INCREMENT PRIMARY KEY,
    `key` VARCHAR(20) UNIQUE NOT NULL,
    status ENUM('pending', 'active', 'expired', 'invalid') DEFAULT 'pending',
    device_id VARCHAR(100) DEFAULT NULL,
    expiry_date DATE NOT NULL,
    activated_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert sample keys (2000 EGP / year)
-- These are demo keys - generate more using generate_keys.php

INSERT INTO activation_keys (`key`, status, expiry_date) VALUES
('SKY1-PRO2-0001-2026', 'pending', '2026-04-22'),
('SKY1-PRO2-0002-2026', 'pending', '2026-04-22'),
('SKY1-PRO2-0003-2026', 'pending', '2026-04-22'),
('SKY1-PRO2-0004-2026', 'pending', '2026-04-22'),
('SKY1-PRO2-0005-2026', 'pending', '2026-04-22'),
('SKY1-PRO2-0006-2026', 'pending', '2026-04-22'),
('SKY1-PRO2-0007-2026', 'pending', '2026-04-22'),
('SKY1-PRO2-0008-2026', 'pending', '2026-04-22'),
('SKY1-PRO2-0009-2026', 'pending', '2026-04-22'),
('SKY1-PRO2-0010-2026', 'pending', '2026-04-22');

CREATE TABLE IF NOT EXISTS app_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    action VARCHAR(100) NOT NULL,
    details TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
