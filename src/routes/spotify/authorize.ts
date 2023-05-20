import { Action, ctx, io } from "@interval/sdk";
import { requireSpotifyAuth } from "../../auth";

export default new Action({
  name: "Authorize",
  description:
    "Authorize with Spotify. You do not need to run this manually, it will run automatically before other actions.",
  handler: async () => {
    await requireSpotifyAuth();
    ctx.redirect({ route: "spotify" });
  },
});
