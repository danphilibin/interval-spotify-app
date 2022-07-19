import { ctx } from "@interval/sdk";
import SpotifyWebApi from "spotify-web-api-node";
import { getDateString, monthNames, sleep } from "./util";

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
});

export async function collectTracksForMonth({ date }: { date: Date }) {
  const pagedTracks: SpotifyApi.SavedTrackObject[] = [];
  let page = 0;

  const month = date.getMonth();
  const year = date.getFullYear();

  const monthNameString = `${monthNames[month]} ${year}`;

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
        new Date(t.added_at).getMonth() + 1 === month &&
        new Date(t.added_at).getFullYear() === year
    );

    ctx.log(`- Tracks from ${monthNameString} in this page:`, items.length);

    // avoid rate limiting
    await sleep(1000);

    page++;

    if (items.length === 0) {
      if (pagedTracks.length > 0) {
        // reached the end
        break;
      }

      if (
        lastTrackDate.getMonth() + 1 < month &&
        lastTrackDate.getFullYear() < year
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

  return tracksFromMonth;
}

export default spotifyApi;
