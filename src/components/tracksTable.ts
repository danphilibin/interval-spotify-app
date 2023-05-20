import { io } from "@interval/sdk";
import { SpotifyTrackObject } from "../spotify";
import { getRelativeDateString } from "../util";
import { Playlist, PlaylistToTrack, Track } from "@prisma/client";

type PlaylistAssociation = PlaylistToTrack & {
  playlist: Playlist;
};

export function tracksTable(
  tracks: Track[],
  playlistTracks?: PlaylistAssociation[]
) {
  return io.display.table("", {
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
        label: "In playlists",
        renderCell: (row) => ({
          label: playlistTracks
            .filter((pt) => pt.trackId === row.id)
            .map((pt) => pt.playlist.name)
            .join(", "),
        }),
      },
      // {
      //   label: "Date added",
      //   renderCell: (row) => getRelativeDateString(new Date(row.added_at)),
      // },
    ],
    rowMenuItems: (row) => [
      {
        label: "Listen on Spotify",
        url: row.spotifyUri,
      },
      {
        label: "Analyze track",
        route: "spotify/analyzeTrack",
        params: { trackId: row.id },
      },
    ],
  });
}
