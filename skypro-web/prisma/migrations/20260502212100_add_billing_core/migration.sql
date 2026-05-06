CREATE TABLE `invoices` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `user_id` INTEGER NOT NULL,
  `subscription_id` INTEGER NULL,
  `invoice_number` VARCHAR(191) NOT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'draft',
  `subtotal` DOUBLE NOT NULL DEFAULT 0,
  `tax_amount` DOUBLE NOT NULL DEFAULT 0,
  `discount_amount` DOUBLE NOT NULL DEFAULT 0,
  `total_amount` DOUBLE NOT NULL DEFAULT 0,
  `currency` VARCHAR(191) NOT NULL DEFAULT 'EGP',
  `due_date` DATETIME(3) NULL,
  `paid_at` DATETIME(3) NULL,
  `notes` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  UNIQUE INDEX `invoices_invoice_number_key`(`invoice_number`),
  INDEX `invoices_user_id_idx`(`user_id`),
  INDEX `invoices_subscription_id_idx`(`subscription_id`),
  INDEX `invoices_status_idx`(`status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `payments` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `user_id` INTEGER NULL,
  `subscription_id` INTEGER NULL,
  `invoice_id` INTEGER NULL,
  `provider` VARCHAR(191) NULL,
  `provider_ref` VARCHAR(191) NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
  `amount` DOUBLE NOT NULL,
  `currency` VARCHAR(191) NOT NULL DEFAULT 'EGP',
  `method` VARCHAR(191) NULL,
  `paid_at` DATETIME(3) NULL,
  `metadata` JSON NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  INDEX `payments_user_id_idx`(`user_id`),
  INDEX `payments_subscription_id_idx`(`subscription_id`),
  INDEX `payments_invoice_id_idx`(`invoice_id`),
  INDEX `payments_status_idx`(`status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `invoices`
  ADD CONSTRAINT `invoices_user_id_fkey`
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `invoices`
  ADD CONSTRAINT `invoices_subscription_id_fkey`
  FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `payments`
  ADD CONSTRAINT `payments_user_id_fkey`
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `payments`
  ADD CONSTRAINT `payments_subscription_id_fkey`
  FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `payments`
  ADD CONSTRAINT `payments_invoice_id_fkey`
  FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
