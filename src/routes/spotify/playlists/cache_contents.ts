import { Action } from "@interval/sdk";
import { requireParam } from "../../../util";
import spotifyApi, {
  cachePlaylistTracks,
  collectTracksFromPlaylist,
} from "../../../spotify";
import { requireSpotifyPageAuth } from "../../../auth";

export default new Action({
  name: "Cache playlist contents",
  unlisted: true,
  handler: async () => {
    await requireSpotifyPageAuth();

    const playlistId = requireParam("playlistId");

    const playlist = await spotifyApi.getPlaylist(playlistId);

    const tracks = await collectTracksFromPlaylist(playlist.body);
    await cachePlaylistTracks(playlistId, tracks);
  },
});
