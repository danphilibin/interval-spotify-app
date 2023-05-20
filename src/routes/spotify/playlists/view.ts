import { io, Page, Layout } from "@interval/sdk";
import { requireSpotifyPageAuth } from "../../../auth";
import prisma from "../../../prisma";
import { requireParam } from "../../../util";

export default new Page({
  name: "View playlist",
  unlisted: true,
  handler: async () => {
    const maybeAuth = await requireSpotifyPageAuth();

    if (maybeAuth) {
      return maybeAuth;
    }

    const playlistId = requireParam("id");

    const playlist = await prisma.playlist.findUniqueOrThrow({
      where: { id: playlistId },
      include: { tracks: { include: { track: true } } },
    });

    const tracks = playlist.tracks.map((t) => t.track);

    return new Layout({
      title: playlist.name,
      menuItems: [
        {
          label: "Refresh cache",
          route: "spotify/playlists/cache_contents",
          theme: "secondary",
          params: { playlistId: playlist.id },
        },
      ],
      children: [
        io.display.table("Tracks in playlist", {
          data: tracks,
          columns: [
            {
              label: "Name",
              accessorKey: "name",
            },
            {
              label: "Artist",
              accessorKey: "artistsString",
            },
          ],
        }),
      ],
    });
  },
});
