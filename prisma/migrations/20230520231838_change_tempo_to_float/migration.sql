/*
  Warnings:

  - You are about to alter the column `tempo` on the `Track` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Float`.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Track" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "spotifyUri" TEXT NOT NULL,
    "artistsString" TEXT NOT NULL,
    "album" TEXT NOT NULL,
    "imageUrl" TEXT,
    "key" INTEGER,
    "tempo" REAL,
    "duration" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Track" ("album", "artistsString", "createdAt", "duration", "id", "imageUrl", "key", "name", "spotifyUri", "tempo", "updatedAt") SELECT "album", "artistsString", "createdAt", "duration", "id", "imageUrl", "key", "name", "spotifyUri", "tempo", "updatedAt" FROM "Track";
DROP TABLE "Track";
ALTER TABLE "new_Track" RENAME TO "Track";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
