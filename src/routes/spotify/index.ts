import { io, Layout, Page } from "@interval/sdk";
import { requireSpotifyPageAuth } from "../../auth";
import spotifyApi from "../../spotify";

export default new Page({
  name: "Spotify",
  handler: async () => {
    await requireSpotifyPageAuth();

    const [topArtists, topTracks, myProfile, liked] = await Promise.all([
      spotifyApi.getMyTopArtists({ limit: 1, time_range: "medium_term" }),
      spotifyApi.getMyTopTracks({ limit: 1, time_range: "medium_term" }),
      spotifyApi.getMe(),
      spotifyApi.getMySavedTracks({
        limit: 50,
      }),
    ]);

    return new Layout({
      title: "🎧 Dan's Spotify",
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
          menuItems: [
            {
              label: "Create playlist",
              route: "spotify/monthlyLikesPlaylist",
            },
          ],
        }),
        io.display.grid("", {
          data: liked.body.items.map((i) => i.track),
          idealColumnWidth: 250,
          renderItem: (row) => ({
            title: row.name,
            description: row.artists.map((a) => a.name).join(", "),
            url: row.uri,
            image: {
              url: row.album.images[0].url,
              aspectRatio: 1,
            },
            menu: [
              {
                label: "Listen on Spotify",
                url: row.uri,
              },
              {
                label: "Analyze track",
                route: "spotify/analyzeTrack",
                params: { trackId: row.id },
              },
              ...row.artists.map((a) => ({
                label: `View ${a.name}`,
                route: "spotify/artist",
                params: { artistId: a.id },
              })),
            ],
          }),
        }),
      ],
    });
  },
});
