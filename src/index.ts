import "dotenv/config";
import Interval, { ctx, io } from "@interval/sdk";
import SpotifyWebApi from "spotify-web-api-node";
import {
  getDateString,
  monthNames,
  sleep,
  splitArrayIntoBatches,
  spotifyScopes,
} from "./util";

// store this in memory to reuse between transactions, as long as the server doesn't restart
let accessToken: string | null = null;

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
});

async function checkAuth() {
  spotifyApi.setAccessToken(accessToken);
  await spotifyApi.getMe();
}

function checkRequiredKeys() {
  if (!("SPOTIFY_CLIENT_ID" in process.env)) {
    throw new Error("SPOTIFY_CLIENT_ID is not set");
  }
  if (!("SPOTIFY_CLIENT_SECRET" in process.env)) {
    throw new Error("SPOTIFY_CLIENT_SECRET is not set");
  }
  if (!("INTERVAL_KEY" in process.env)) {
    throw new Error("INTERVAL_KEY is not set");
  }
  if (!("INTERVAL_ORG_SLUG" in process.env)) {
    throw new Error("INTERVAL_ORG_SLUG is not set");
  }
}

const interval = new Interval({
  apiKey: process.env.INTERVAL_KEY,
  actions: {
    monthly_likes_playlist: async () => {
      const actionSlug = "monthly_likes_playlist";

      checkRequiredKeys();

      // important! the slug below must match the slug of this action, including your organization:
      const redirectUri = `https://interval.com/dashboard/${process.env.INTERVAL_ORG_SLUG}/develop/actions/${actionSlug}`;

      spotifyApi.setRedirectURI(redirectUri);

      try {
        if (!accessToken && !ctx.params.code) {
          // Generate a URL for the user to visit to authorize the app
          const params = new URLSearchParams({
            response_type: "code",
            client_id: process.env.SPOTIFY_CLIENT_ID,
            redirect_uri: redirectUri,
            scope: spotifyScopes.join(" "),
          });

          await io.display.link("Click here to authorize Spotify", {
            href: `https://accounts.spotify.com/authorize?${params.toString()}`,
          });

          return;
        }

        if (ctx.params.code) {
          // returning from the OAuth flow; request an access token
          const tokens = await spotifyApi.authorizationCodeGrant(
            String(ctx.params.code)
          );

          accessToken = tokens.body.access_token;
        }

        await checkAuth();
      } catch (error) {
        console.error(error);

        await io.group([
          io.display.markdown(
            "The auth state has expired, please restart the action:"
          ),
          io.display.link("Restart action", {
            href: redirectUri,
            // linking to the same action currently does not work
            // action: actionSlug,
          }),
        ]);
      }

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
});

interval.listen();
