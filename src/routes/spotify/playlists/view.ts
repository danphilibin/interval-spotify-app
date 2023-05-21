import { io, Page, Layout } from "@interval/sdk";
import { requireSpotifyPageAuth } from "../../../auth";
import prisma from "../../../prisma";
import {
  getRelativeDateString,
  numericKeyToCamelotKey,
  requireParam,
  secondsToMinutes,
} from "../../../util";
import spotifyApi, { collectTracksFromPlaylist } from "../../../spotify";
import { PlaylistToTrack, Prisma, Track } from "@prisma/client";

type PlaylistTracks = (PlaylistToTrack & {
  track: Pick<
    Track,
    | "album"
    | "artistsString"
    | "duration"
    | "id"
    | "imageUrl"
    | "key"
    | "name"
    | "tempo"
    | "spotifyUri"
  >;
})[];

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
      include: {
        tracks: {
          include: { track: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    const spotifyPlaylist = await spotifyApi.getPlaylist(playlist.id);

    let tracks: PlaylistTracks = playlist.tracks;

    if (!tracks.length && spotifyPlaylist.body.tracks.total) {
      const playlistTracks = await collectTracksFromPlaylist(playlist);

      tracks = playlistTracks.map((track, id) => ({
        ...track,
        id,
        createdAt: new Date(track.added_at),
        updatedAt: new Date(track.added_at),
        playlistId: playlist.id,
        trackId: track.track.id,
        track: {
          id: track.track.id,
          name: track.track.name,
          artistsString: track.track.artists.map((a) => a.name).join(", "),
          spotifyUri: track.track.uri,
          album: track.track.album.name,
          imageUrl: track.track.album.images[0]?.url,
          duration: null,
          key: null,
          tempo: null,
        },
      }));
    }

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
                row.track.key ? numericKeyToCamelotKey(row.track.key) : "-",
            },
            {
              label: "BPM",
              renderCell: (row) =>
                row.track.tempo ? `${Math.round(row.track.tempo)}` : "-",
            },
            {
              label: "Duration",
              renderCell: (row) =>
                row.track.duration
                  ? secondsToMinutes(row.track.duration / 1000)
                  : "-",
            },
            {
              label: "Added",
              renderCell: (row) => ({
                label: getRelativeDateString(row.createdAt),
              }),
            },
          ],
          rowMenuItems: (row) => [
            {
              label: "Listen on Spotify",
              url: row.track.spotifyUri,
            },
            {
              label: "Add to playlist",
              route: "spotify/add_track_to_playlist",
              params: { trackId: row.track.id },
            },
          ],
        }),
      ],
    });
  },
});
