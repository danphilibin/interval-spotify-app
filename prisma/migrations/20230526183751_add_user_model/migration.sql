/*
  Note: we're starting from single-user support so we can safely assign
  all existing data to the first user.
*/

-- Create User table
CREATE TABLE `User` (
  `id` VARCHAR(191) NOT NULL,
  `displayName` VARCHAR(191) NOT NULL,
  `intervalEmail` VARCHAR(191) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable
ALTER TABLE `User` ADD UNIQUE INDEX `User_intervalEmail_key`(`intervalEmail`);

-- Create first user from values in Settings table:
INSERT INTO `User` (id, intervalEmail, displayName)
SELECT s2.value, '<not set>', s1.value
FROM Settings s1, Settings s2
WHERE s1.name = 'spotifyDisplayName' AND s2.name = 'spotifyUserId';

-- Get the first user
SET @userId = (SELECT id FROM User LIMIT 1);

-- Add optional userId column to Playlist
ALTER TABLE `Playlist` ADD COLUMN `userId` VARCHAR(191);

-- Update all playlists to have the first user as owner
UPDATE Playlist SET userId = @userId;

-- Make userId column non-nullable
ALTER TABLE `Playlist` MODIFY COLUMN `userId` VARCHAR(191) NOT NULL;

-- Add userId column to Settings
ALTER TABLE `Settings` DROP PRIMARY KEY, ADD COLUMN `userId` VARCHAR(191);

-- Update all settings to have the first user as owner
UPDATE Settings SET userId = @userId;

-- Make userId column non-nullable
ALTER TABLE `Settings` MODIFY COLUMN `userId` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Settings_name_userId_key` ON `Settings`(`name`, `userId`);

-- AddForeignKey
ALTER TABLE `Playlist` ADD CONSTRAINT `Playlist_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Settings` ADD CONSTRAINT `Settings_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
