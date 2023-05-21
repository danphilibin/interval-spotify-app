import { io, Layout, Page } from "@interval/sdk";
import { requireSpotifyPageAuth } from "../../auth";
import spotifyApi from "../../spotify";
import { getRelativeDateString } from "../../util";
import prisma from "../../prisma";

export default new Page({
  name: "Spotify",
  description: "",
  handler: async () => {
    const maybeAuth = await requireSpotifyPageAuth();

    if (maybeAuth) {
      return maybeAuth;
    }

    const [topArtists, topTracks, myProfile, liked, playlistTracks] =
      await Promise.all([
        spotifyApi.getMyTopArtists({ limit: 1, time_range: "medium_term" }),
        spotifyApi.getMyTopTracks({ limit: 1, time_range: "medium_term" }),
        spotifyApi.getMe(),
        spotifyApi.getMySavedTracks({
          limit: 50,
        }),
        prisma.playlistToTrack.findMany({
          include: { playlist: true },
        }),
      ]);

    return new Layout({
      title: `🎧 ${myProfile.body.display_name}'s Spotify`,
      children: [
        io.display.metadata("", {
          layout: "card",
          data: [
            {
              label: "Top track",
              value: topTracks.body.items[0].name,
              url: topTracks.body.items[0].uri,
            },
            {
              label: "Top artist",
              value: topArtists.body.items[0].name,
              // url: topArtists.body.items[0].uri,
              route: "spotify/artist",
              params: { artistId: topArtists.body.items[0].id },
            },
            {
              label: "Followers",
              value: myProfile.body.followers.total,
            },
          ],
        }),
        io.display.heading("Recent likes", {
          // menuItems: [
          //   {
          //     label: "Create playlist",
          //     route: "spotify/monthlyLikesPlaylist",
          //   },
          // ],
        }),
        io.display.table("", {
          data: liked.body.items,
          columns: [
            {
              label: "Image",
              renderCell: (row) => ({
                image: {
                  url: row.track.album.images[0].url,
                  width: "thumbnail",
                },
                // url: row.track.uri,
              }),
            },
            {
              label: "Title",
              renderCell: (row) => ({
                label: `**${row.track.name}**  \n${row.track.artists
                  .map((a) => a.name)
                  .join(", ")}`,
              }),
            },
            {
              label: "In playlists",
              renderCell: (row) => ({
                label: playlistTracks
                  .filter((pt) => pt.trackId === row.track.id)
                  .map((pt) => pt.playlist.name)
                  .join(", "),
              }),
            },
            {
              label: "Date added",
              renderCell: (row) =>
                getRelativeDateString(new Date(row.added_at)),
            },
          ],
          rowMenuItems: (row) => [
            {
              label: "Listen on Spotify",
              url: row.track.uri,
            },
            {
              label: "Analyze track",
              route: "spotify/utilities/analyze_track",
              params: { trackId: row.track.id },
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
