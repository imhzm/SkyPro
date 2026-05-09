CREATE TABLE `newsletter_subscribers` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `email` VARCHAR(191) NOT NULL,
  `source` VARCHAR(191) NULL DEFAULT 'homepage_footer',
  `status` VARCHAR(191) NOT NULL DEFAULT 'active',
  `unsubscribed_at` DATETIME(3) NULL,
  `ip_address` VARCHAR(191) NULL,
  `user_agent` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  UNIQUE INDEX `newsletter_subscribers_email_key`(`email`),
  INDEX `newsletter_subscribers_status_idx`(`status`),
  INDEX `newsletter_subscribers_created_at_idx`(`created_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
