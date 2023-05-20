import { io, Page, Layout } from "@interval/sdk";
import { requireSpotifyPageAuth } from "../../../auth";
import prisma from "../../../prisma";
import {
  numericKeyToCamelotKey,
  requireParam,
  secondsToMinutes,
} from "../../../util";

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
              label: "Image",
              renderCell: (row) => ({
                image: {
                  url: row.imageUrl,
                  width: "thumbnail",
                },
                // url: row.track.uri,
              }),
            },
            {
              label: "Title",
              renderCell: (row) => ({
                label: `**${row.name}**  \n${row.artistsString}`,
              }),
            },
            {
              label: "Artist",
              accessorKey: "artistsString",
            },
            {
              label: "Key",
              renderCell: (row) =>
                row.key ? numericKeyToCamelotKey(row.key) : "N/A",
            },
            {
              label: "BPM",
              renderCell: (row) =>
                row.tempo ? `${Math.round(row.tempo)} BPM` : "N/A",
            },
            {
              label: "Duration",
              renderCell: (row) =>
                row.duration ? secondsToMinutes(row.duration / 1000) : "N/A",
            },
          ],
        }),
      ],
    });
  },
});
