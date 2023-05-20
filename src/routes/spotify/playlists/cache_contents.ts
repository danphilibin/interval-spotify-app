import { Action } from "@interval/sdk";
import { requireParam } from "../../../util";
import spotifyApi, { collectTracksFromPlaylist } from "../../../spotify";
import { requireSpotifyPageAuth } from "../../../auth";
import prisma from "../../../prisma";

export default new Action({
  name: "Cache playlist contents",
  unlisted: true,
  handler: async () => {
    await requireSpotifyPageAuth();

    const playlistId = requireParam("playlistId");

    const tracks = await collectTracksFromPlaylist({ playlistId });

    const playlist = await spotifyApi.getPlaylist(playlistId);

    await prisma.playlist.upsert({
      where: { id: playlistId },
      create: {
        id: playlistId,
        name: playlist.body.name,
        total: playlist.body.tracks.total,
      },
      update: {
        name: playlist.body.name,
        total: playlist.body.tracks.total,
      },
    });

    // remove existing playlist associations
    await prisma.playlistToTrack.deleteMany({
      where: { playlistId },
    });

    for (const track of tracks) {
      const data = {
        name: track.name,
        artistsString: track.artists.join(", "),
        spotifyUri: track.spotifyUri,
        album: track.album,
      };

      await prisma.track.upsert({
        where: { id: track.id },
        create: {
          id: track.id,
          ...data,
        },
        update: data,
      });

      await prisma.playlistToTrack.upsert({
        where: { playlistId_trackId: { playlistId, trackId: track.id } },
        create: { playlistId, trackId: track.id },
        update: {},
      });
    }
  },
});
