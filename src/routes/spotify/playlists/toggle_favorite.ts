import { Action } from "@interval/sdk";
import { requireParam } from "../../../util";
import prisma from "../../../prisma";
import {
  cachePlaylistTracks,
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

    const isFavoriting = !playlist.isFavorite;

    await prisma.playlist.update({
      where: { id },
      data: {
        isFavorite: isFavoriting,
      },
    });

    if (isFavoriting) {
      const tracks = await collectTracksFromPlaylist(playlist);
      await cachePlaylistTracks(playlist.id, tracks);
    } else {
      // remove associations for non-cached playlists so we don't end up with a bunch of dead data
      await prisma.playlistToTrack.deleteMany({
        where: { playlistId: playlist.id },
      });
    }

    return `Toggled favorite status for playlist ${playlist.name}`;
  },
});
