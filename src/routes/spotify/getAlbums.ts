import { Action } from "@interval/sdk";
import { io } from "@interval/sdk";
import { requireSpotifyAuth } from "../../auth";
import spotifyApi from "../../spotify";

export default new Action({
  name: "Get recent likes JSON",
  description: "Generate a playlist containing your likes from any month.",
  handler: async () => {
    await requireSpotifyAuth();
    const liked = await spotifyApi.getMySavedTracks({
      limit: 50,
      offset: 0,
    });

    await io.display.code("output", {
      code: JSON.stringify(
        liked.body.items.map((item) => ({
          name: item.track.name,
          artists: item.track.artists.map((a) => a.name).join(", "),
          imageUrl: item.track.album.images[0].url,
        }))
      ),
    });
  },
});
