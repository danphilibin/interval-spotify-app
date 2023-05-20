import { io, Page, Layout } from "@interval/sdk";
import { requireSpotifyPageAuth } from "../../../auth";
import prisma from "../../../prisma";

export default new Page({
  name: "Playlists",
  handler: async () => {
    const maybeAuth = await requireSpotifyPageAuth();

    if (maybeAuth) {
      return maybeAuth;
    }

    const playlists = await prisma.playlist.findMany();

    return new Layout({
      title: "Playlists",
      menuItems: [
        {
          label: "Refresh cache",
          route: "spotify/playlists/cache_all",
          theme: "secondary",
        },
      ],
      children: [
        io.display.table("", {
          data: playlists,
          columns: [
            {
              label: "Name",
              renderCell: (playlist) => ({
                label: `**${playlist.name}**${
                  playlist.description ? "  \n" + playlist.description : ""
                }`,
                route: "spotify/playlists/view",
                params: { id: playlist.id },
              }),
            },
            {
              label: "Tracks",
              renderCell: (playlist) => playlist.total,
            },
            {
              label: "Collaborative?",
              renderCell: (playlist) => playlist.collaborative,
            },
            {
              label: "Public?",
              renderCell: (playlist) => playlist.public,
            },
          ],
          rowMenuItems: (row) => [
            {
              label: "View",
              route: "spotify/playlists/view",
              params: { id: row.id },
            },
            {
              label: "Cache contents",
              route: "spotify/playlists/cache_contents",
              params: { playlistId: row.id },
            },
          ],
        }),
      ],
    });
  },
});
