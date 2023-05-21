import { Action, io } from "@interval/sdk";
import { requireParam } from "../../../util";
import prisma from "../../../prisma";
import {
  cachePlaylistTracks,
  collectAndCachePlaylistTracks,
  collectTracksFromPlaylist,
} from "../../../spotify";
import { requireSpotifyAuth } from "../../../auth";

export default new Action({
  name: "Toggle favorite",
  unlisted: true,
  handler: async () => {
    await requireSpotifyAuth();

    const id = requireParam("id");

    const playlist = await prisma.playlist.findUniqueOrThrow({
      where: { id },
    });

    await io.display.markdown(`### ${playlist.name}\n${playlist.total} tracks`);

    const isFavoriting = !playlist.isFavorite;

    await prisma.playlist.update({
      where: { id },
      data: {
        isFavorite: isFavoriting,
      },
    });

    if (isFavoriting) {
      await collectAndCachePlaylistTracks(playlist);
    } else {
      // remove associations for non-cached playlists so we don't end up with a bunch of dead data
      await prisma.playlistToTrack.deleteMany({
        where: { playlistId: playlist.id },
      });
    }

    return `Toggled favorite status for playlist ${playlist.name}`;
  },
});
