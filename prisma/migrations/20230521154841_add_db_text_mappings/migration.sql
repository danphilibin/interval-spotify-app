-- AlterTable
ALTER TABLE `Playlist` MODIFY `description` TEXT NULL;

-- AlterTable
ALTER TABLE `Settings` MODIFY `value` TEXT NOT NULL;

-- AlterTable
ALTER TABLE `Track` MODIFY `artistsString` TEXT NOT NULL,
    MODIFY `imageUrl` TEXT NULL;
