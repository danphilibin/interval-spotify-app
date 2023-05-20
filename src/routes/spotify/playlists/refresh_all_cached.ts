import { Action, io, ctx } from "@interval/sdk";
import prisma from "../../../prisma";
import { collectTracksFromPlaylist } from "../../../spotify";
import { sleep } from "../../../util";

export default new Action({
  name: "Refresh all cached playlists",
  handler: async () => {
    const playlists = await prisma.playlist.findMany({
      where: { isFavorite: true },
    });

    const shouldContinue = await io.confirm(
      `Refresh ${playlists.length} playlists?`
    );

    if (!shouldContinue) {
      return;
    }

    for (const playlist of playlists) {
      await io.display.markdown(`Refreshing ${playlist.name}...`);
      await collectTracksFromPlaylist(playlist);
      // avoid rate limiting
      ctx.loading.update("Waiting 2 seconds to avoid rate limiting...");
      await sleep(2000);
    }
  },
});
