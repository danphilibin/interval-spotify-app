import { ctx, io } from "@interval/sdk";
import spotifyApi from "./spotify";
import { spotifyScopes } from "./util";

// store this in memory to reuse between transactions, as long as the server doesn't restart
export let accessToken: string | null = null;

function checkRequiredKeys() {
  const requiredKeys = [
    "SPOTIFY_CLIENT_ID",
    "SPOTIFY_CLIENT_SECRET",
    "INTERVAL_KEY",
  ];

  for (const key of requiredKeys) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }
}

async function checkAuth() {
  spotifyApi.setAccessToken(accessToken);
  await spotifyApi.getMe();
}

export async function requireSpotifyAuth() {
  checkRequiredKeys();

  const redirectUri = `https://interval.com/dashboard/${
    ctx.organization.slug
  }/${ctx.environment === "development" ? "develop/actions" : "actions"}/${
    ctx.action.slug
  }`;

  // IMPORTANT: this URI must be added to the Spotify developer dashboard
  spotifyApi.setRedirectURI(redirectUri);

  try {
    if (!accessToken && !ctx.params.code) {
      await beginAuth(redirectUri);
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

    // start over
    await beginAuth(redirectUri);
  }
}

async function beginAuth(redirectUri: string) {
  // Generate a URL for the user to visit to authorize the app
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.SPOTIFY_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: spotifyScopes.join(" "),
  });

  await io.display.link("Click here to authorize Spotify", {
    url: `https://accounts.spotify.com/authorize?${params.toString()}`,
  });
}
