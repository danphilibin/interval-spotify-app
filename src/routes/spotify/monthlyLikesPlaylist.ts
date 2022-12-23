import { Action, ctx, io } from "@interval/sdk";
import { monthNames, splitArrayIntoBatches } from "../../util";
import { requireSpotifyAuth } from "../../auth";
import spotifyApi, { collectTracksForMonth } from "../../spotify";

export default new Action({
  name: "Monthly likes playlist",
  description: "Generate a playlist containing your likes from any month.",
  handler: async () => {
    await requireSpotifyAuth();

    const date = await io.input.date(
      "Choose a month to generate a playlist for:"
    );

    await ctx.loading.start({
      title: "Looking through your record crates...",
    });

    const monthNameString = `${monthNames[date.month - 1]} ${date.year}`;

    const tracksFromMonth = await collectTracksForMonth({
      date: date.jsDate,
    });

    await io.display.table(`Your likes from ${monthNameString}`, {
      data: tracksFromMonth,
      defaultPageSize: 100,
      rowMenuItems: (row) => [
        {
          label: "Listen on Spotify",
          url: row.uri,
        },
      ],
    });

    await io.confirm(`Create a playlist for ${monthNameString}?`);

    const batches = splitArrayIntoBatches(tracksFromMonth, 100);

    await ctx.loading.start({
      title: "Adding tracks to playlist...",
      itemsInQueue: batches.length,
    });

    const playlist = (
      await spotifyApi.createPlaylist(
        `Liked - ${monthNames[date.month - 1]} ${date.year}`,
        { public: false, collaborative: false }
      )
    ).body;

    for (const batch of batches) {
      await spotifyApi.addTracksToPlaylist(
        playlist.id,
        batch.map((t) => t.uri)
      );
      ctx.loading.completeOne();
    }

    await io.display.link("View playlist", {
      url: playlist.external_urls.spotify,
    });
  },
});
