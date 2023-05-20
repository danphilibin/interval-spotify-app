import { io, Action } from "@interval/sdk";
import { requireSpotifyAuth } from "../../../auth";
import { collectPlaylists } from "../../../spotify";

export default new Action({
  name: "Cache all playlists",
  unlisted: true,
  handler: async () => {
    await requireSpotifyAuth();

    await io.display.markdown(
      "Notes:\n- This only caches playlist metadata, not the contents of each playlist. To cache the contents of a playlist, go to the playlist page and click the 'Refresh cache' button.\n- Only playlists you own will be cached."
    );

    const playlists = await collectPlaylists({ cache: true });

    await io.display.link("Go to Playlists", {
      route: "spotify/playlists",
    });

    return `Cached ${playlists.length} playlists`;
  },
});
