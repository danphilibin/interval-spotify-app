import "dotenv/config";
import Interval, { ctx, io } from "@interval/sdk";
import {
  getDateString,
  monthNames,
  sleep,
  splitArrayIntoBatches,
} from "./util";
import { requireSpotifyAuth } from "./auth";
import spotifyApi from "./spotify";

const interval = new Interval({
  apiKey: process.env.INTERVAL_KEY,
  actions: {
    monthly_likes_playlist: {
      name: "Monthly likes playlist",
      description: "Generate a playlist containing your likes from any month.",
      handler: async () => {
        await requireSpotifyAuth();

        const date = await io.experimental.date(
          "Choose a month to generate a playlist for:"
        );

        await ctx.loading.start({
          title: "Looking through your record crates...",
        });

        const monthNameString = `${monthNames[date.month - 1]} ${date.year}`;

        const pagedTracks: SpotifyApi.SavedTrackObject[] = [];
        let page = 0;

        while (true) {
          ctx.log(`Fetching page ${page + 1}`);

          const liked = await spotifyApi.getMySavedTracks({
            limit: 50,
            offset: page * 50,
          });

          const lastTrackDate = new Date(liked.body.items[0].added_at);

          ctx.loading.update({ description: getDateString(lastTrackDate) });

          const items = liked.body.items.filter(
            (t) =>
              new Date(t.added_at).getMonth() + 1 === date.month &&
              new Date(t.added_at).getFullYear() === date.year
          );

          ctx.log(
            `- Tracks from ${monthNameString} in this page:`,
            items.length
          );

          // avoid rate limiting
          await sleep(1000);

          page++;

          if (items.length === 0) {
            if (pagedTracks.length > 0) {
              // reached the end
              break;
            }

            if (
              lastTrackDate.getMonth() + 1 < date.month &&
              lastTrackDate.getFullYear() < date.year
            ) {
              // have paged beyond the month we're searching for
              break;
            }

            continue;
          }

          pagedTracks.push(...items);
        }

        const tracksFromMonth: (Pick<
          SpotifyApi.SavedTrackObject["track"],
          "id" | "uri" | "name"
        > & {
          artists: string;
          added_at: string;
        })[] = [];

        pagedTracks.forEach(async (item) => {
          const { uri, artists, name, id } = item.track;

          tracksFromMonth.push({
            id,
            uri,
            name,
            artists: artists.map((a) => a.name).join(", "),
            added_at: item.added_at,
          });
        });

        await io.display.table(`Your likes from ${monthNameString}`, {
          data: tracksFromMonth,
        });

        await io.confirm(`Create a playlist for ${monthNameString}?`);

        const playlist = (
          await spotifyApi.createPlaylist(
            `Liked - ${monthNames[date.month - 1]} ${date.year}`,
            { public: false, collaborative: false }
          )
        ).body;

        const batches = splitArrayIntoBatches(tracksFromMonth, 100);

        await ctx.loading.start({
          title: "Adding tracks to playlist...",
          itemsInQueue: batches.length,
        });

        for (const batch of batches) {
          await spotifyApi.addTracksToPlaylist(
            playlist.id,
            batch.map((t) => t.uri)
          );
          ctx.loading.completeOne();
        }

        await io.display.link("View playlist", {
          href: playlist.external_urls.spotify,
        });
      },
    },
  },
});

interval.listen();
