-- Security hardening: track password changes for session invalidation,
-- account lockout state, 2FA fields, and last-login telemetry.
ALTER TABLE `users`
  ADD COLUMN `password_changed_at` DATETIME(3) NULL,
  ADD COLUMN `failed_login_count` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `locked_until` DATETIME(3) NULL,
  ADD COLUMN `two_factor_enabled` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `two_factor_secret` VARCHAR(191) NULL,
  ADD COLUMN `last_login_at` DATETIME(3) NULL,
  ADD COLUMN `last_login_ip` VARCHAR(191) NULL;

CREATE INDEX `users_locked_until_idx` ON `users`(`locked_until`);
CREATE INDEX `users_last_login_at_idx` ON `users`(`last_login_at`);
