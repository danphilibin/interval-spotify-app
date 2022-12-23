import { io, Layout, Page } from "@interval/sdk";
import { requireSpotifyPageAuth } from "../../auth";
import spotifyApi from "../../spotify";
import { requireParam } from "../../util";

export default new Page({
  name: "Artist",
  unlisted: true,
  handler: async () => {
    await requireSpotifyPageAuth();

    const artistId = requireParam("artistId");

    const [artist, topTracks, relatedArtists] = await Promise.all([
      spotifyApi.getArtist(artistId),
      spotifyApi.getArtistTopTracks(artistId, "US"),
      spotifyApi.getArtistRelatedArtists(artistId),
    ]);

    return new Layout({
      title: artist.body.name,
      menuItems: [
        {
          label: "View on Spotify",
          url: artist.body.uri,
        },
      ],
      children: [
        io.display.metadata("", {
          layout: "card",
          data: [
            {
              label: "Popularity",
              value: `${artist.body.popularity}%`,
            },
            {
              label: "Followers",
              value: artist.body.followers.total,
            },
          ],
        }),
        io.display.heading("Top tracks", {
          menuItems: [
            {
              label: "View all",
              url: `https://open.spotify.com/artist/${artistId}/top-tracks?country=US`,
            },
          ],
        }),
        io.display.table("", {
          data: topTracks.body.tracks.slice(0, 5),
          columns: [
            // "id",
            {
              label: "Name",
              renderCell: (row) => ({
                label: row.name,
                url: row.uri,
              }),
            },
            {
              label: "Artists",
              renderCell: (track) =>
                track.artists.map((a) => a.name).join(", "),
            },
            {
              label: "URI",
              renderCell: (row) => ({
                label: "View on Spotify",
                url: row.uri,
              }),
            },
          ],
          rowMenuItems: (row) => [
            {
              label: "Listen on Spotify",
              url: row.uri,
            },
            {
              label: "Analyze track",
              route: "spotify/analyzeTrack",
              params: { trackId: row.id },
            },
          ],
        }),
        io.display.heading("Related artists"),
        io.display.table("", {
          data: relatedArtists.body.artists.slice(0, 5),
          columns: [
            {
              label: "Name",
              renderCell: (row) => ({
                label: row.name,
                route: "spotify/artist",
                params: { artistId: row.id },
              }),
            },
            {
              label: "URI",
              renderCell: (row) => ({
                label: "View on Spotify",
                url: row.uri,
              }),
            },
          ],
          rowMenuItems: (row) => [
            {
              label: "View on Spotify",
              url: row.uri,
            },
          ],
        }),
      ],
    });
  },
});
