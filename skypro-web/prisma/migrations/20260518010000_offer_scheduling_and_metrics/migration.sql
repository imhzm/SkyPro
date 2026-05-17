-- Add scheduling + engagement counters to the offers table
ALTER TABLE `offers`
  ADD COLUMN `starts_at` DATETIME(3) NULL,
  ADD COLUMN `ends_at` DATETIME(3) NULL,
  ADD COLUMN `impression_count` INT NOT NULL DEFAULT 0,
  ADD COLUMN `click_count` INT NOT NULL DEFAULT 0;

-- Index used by the public /api/offers endpoint to filter active offers
-- whose schedule window contains "now".
CREATE INDEX `offers_starts_at_ends_at_idx` ON `offers` (`starts_at`, `ends_at`);
