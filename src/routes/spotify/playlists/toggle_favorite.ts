import { Action } from "@interval/sdk";
import { requireParam } from "../../../util";
import prisma from "../../../prisma";

export default new Action({
  name: "Toggle favorite",
  unlisted: true,
  handler: async () => {
    const id = requireParam("id");

    const playlist = await prisma.playlist.findUnique({
      where: { id },
    });

    if (!playlist) {
      return "Playlist not found";
    }

    await prisma.playlist.update({
      where: { id },
      data: {
        isFavorite: !playlist.isFavorite,
      },
    });

    return `Toggled favorite status for playlist ${playlist.name}`;
  },
});
