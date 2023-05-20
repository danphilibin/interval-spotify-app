/*
  Warnings:

  - A unique constraint covering the columns `[playlistId,trackId]` on the table `PlaylistToTrack` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "PlaylistToTrack_playlistId_trackId_key" ON "PlaylistToTrack"("playlistId", "trackId");
