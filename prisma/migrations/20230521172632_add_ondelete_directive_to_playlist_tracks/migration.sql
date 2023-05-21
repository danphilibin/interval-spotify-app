-- DropForeignKey
ALTER TABLE `PlaylistToTrack` DROP FOREIGN KEY `PlaylistToTrack_playlistId_fkey`;

-- AddForeignKey
ALTER TABLE `PlaylistToTrack` ADD CONSTRAINT `PlaylistToTrack_playlistId_fkey` FOREIGN KEY (`playlistId`) REFERENCES `Playlist`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
