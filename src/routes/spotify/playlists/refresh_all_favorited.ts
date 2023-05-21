import { Action, io, ctx } from "@interval/sdk";
import prisma from "../../../prisma";
import {
  cachePlaylistTracks,
  collectAndCachePlaylistTracks,
  collectTracksFromPlaylist,
} from "../../../spotify";
import { sleep } from "../../../util";
import { requireSpotifyAuth } from "../../../auth";

export default new Action({
  name: "Refresh all favorited playlists",
  handler: async () => {
    await requireSpotifyAuth();

    const playlists = await prisma.playlist.findMany({
      where: { isFavorite: true },
    });

    const shouldContinue = await io.confirm(
      `Refresh ${playlists.length} playlists?`,
      {
        helpText:
          "This will refresh all playlists marked as 'favorite', refetching all of the songs and their metadata.\n\nThis may take awhile depending on your number of favorited playlists and the number of songs in them; Spotify supports refreshing 50 songs per playlist at a time.",
      }
    );

    if (!shouldContinue) {
      return;
    }

    for (const playlist of playlists) {
      await io.display.markdown(`Refreshing ${playlist.name}...`);
      await collectAndCachePlaylistTracks(playlist);
      // avoid rate limiting
      await sleep(2000);
    }
  },
});
