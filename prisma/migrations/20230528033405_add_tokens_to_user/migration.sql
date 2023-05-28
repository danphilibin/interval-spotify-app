-- AlterTable
ALTER TABLE `User` ADD COLUMN `accessToken` TEXT NULL,
    ADD COLUMN `refreshToken` TEXT NULL;
