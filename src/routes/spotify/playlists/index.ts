import { io, Page, Layout } from "@interval/sdk";
import { requireSpotifyPageAuth } from "../../../auth";
import prisma from "../../../prisma";
import { collectPlaylists } from "../../../spotify";
import { Prisma } from "@prisma/client";

export default new Page({
  name: "Playlists",
  handler: async () => {
    const maybeAuth = await requireSpotifyPageAuth();

    if (maybeAuth) {
      return maybeAuth;
    }

    const playlistArgs: Prisma.PlaylistFindManyArgs = {
      orderBy: {
        isFavorite: "desc",
      },
      include: {
        _count: {
          select: {
            tracks: true,
          },
        },
      },
    };

    let playlists = await prisma.playlist.findMany(playlistArgs);

    if (playlists.length === 0) {
      await collectPlaylists({ cache: true });
      playlists = await prisma.playlist.findMany(playlistArgs);
    }

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
                label: `**${playlist.isFavorite ? "⭐ " : ""}${
                  playlist.name
                }**${
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
              label: row.isFavorite ? "Unfavorite" : "Mark as favorite",
              route: "spotify/playlists/toggle_favorite",
              params: { id: row.id },
            },
          ],
        }),
      ],
    });
  },
});
