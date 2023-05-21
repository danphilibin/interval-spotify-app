import { Action, io } from "@interval/sdk";
import { requireParam } from "../../../util";
import spotifyApi, { collectAndCachePlaylistTracks } from "../../../spotify";
import { requireSpotifyPageAuth } from "../../../auth";

export default new Action({
  name: "Cache playlist contents",
  unlisted: true,
  handler: async () => {
    await requireSpotifyPageAuth();

    const playlistId = requireParam("playlistId");

    const playlist = await spotifyApi.getPlaylist(playlistId);

    await io.display.markdown(
      `### ${playlist.body.name}\n${playlist.body.tracks.total} tracks`
    );

    await collectAndCachePlaylistTracks(playlist.body);
  },
});
