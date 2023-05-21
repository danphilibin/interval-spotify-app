import { io, Page, Layout } from "@interval/sdk";
import { requireSpotifyPageAuth } from "../../../auth";
import prisma from "../../../prisma";
import {
  getRelativeDateString,
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
          data: playlist.tracks,
          columns: [
            {
              label: "Image",
              renderCell: (row) => ({
                image: {
                  url: row.track.imageUrl,
                  width: "thumbnail",
                },
                // url: row.track.track.uri,
              }),
            },
            {
              label: "Title",
              renderCell: (row) => ({
                label: `**${row.track.name}**  \n${row.track.artistsString}`,
              }),
            },
            {
              label: "Artist",
              renderCell: (row) => row.track.artistsString,
            },
            {
              label: "Key",
              renderCell: (row) =>
                row.track.key ? numericKeyToCamelotKey(row.track.key) : "N/A",
            },
            {
              label: "BPM",
              renderCell: (row) =>
                row.track.tempo ? `${Math.round(row.track.tempo)}` : "N/A",
            },
            {
              label: "Duration",
              renderCell: (row) =>
                row.track.duration
                  ? secondsToMinutes(row.track.duration / 1000)
                  : "N/A",
            },
            {
              label: "Added",
              renderCell: (row) => ({
                label: getRelativeDateString(row.createdAt),
              }),
            },
          ],
        }),
      ],
    });
  },
});
