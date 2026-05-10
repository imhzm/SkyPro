CREATE TABLE `user_api_keys` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `user_id` INTEGER NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `key_hash` VARCHAR(191) NOT NULL,
  `key_prefix` VARCHAR(191) NOT NULL,
  `scopes` TEXT NULL,
  `last_used_at` DATETIME(3) NULL,
  `expires_at` DATETIME(3) NULL,
  `revoked_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `user_api_keys_key_hash_key`(`key_hash`),
  INDEX `user_api_keys_user_id_idx`(`user_id`),
  INDEX `user_api_keys_key_prefix_idx`(`key_prefix`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
