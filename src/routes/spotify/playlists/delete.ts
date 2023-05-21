import { Action, io } from "@interval/sdk";
import { requireSpotifyAuth } from "../../../auth";
import spotifyApi from "../../../spotify";
import { requireParam } from "../../../util";
import prisma from "../../../prisma";

export default new Action({
  name: "Delete playlist",
  unlisted: true,
  handler: async () => {
    await requireSpotifyAuth();

    const playlistId = requireParam("id");

    const playlist = await spotifyApi.getPlaylist(playlistId);

    await io.display.markdown(
      `### ${playlist.body.name}\n${playlist.body.tracks.total} tracks`
    );

    const shouldContinue = await io.confirm(
      "Are you sure you want to delete this playlist?"
    );

    if (!shouldContinue) return;

    // https://developer.spotify.com/documentation/web-api/concepts/playlists#following-and-unfollowing-a-playlist
    await spotifyApi.unfollowPlaylist(playlistId);

    await prisma.playlist.delete({
      where: { id: playlistId },
    });
  },
});
