import { ctx } from "@interval/sdk";
import spotifyApi from "./spotify";
import { spotifyScopes } from "./util";

// store this in memory to reuse between transactions, as long as the server doesn't restart
export let accessToken: string | null = null;

export const AUTHORIZE_ACTION_NAME = "authorize";

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

  await ctx.loading.start("Authorizing with Spotify...");

  if (!accessToken && ctx.action.slug !== AUTHORIZE_ACTION_NAME) {
    return ctx.redirect({
      action: AUTHORIZE_ACTION_NAME,
      params: { returnTo: ctx.action.slug },
    });
  }

  const redirectUri = `https://interval.com/dashboard/${
    ctx.organization.slug
  }/${ctx.environment === "development" ? "develop/actions" : "actions"}/${
    ctx.action.slug
  }`;

  // IMPORTANT: this URI must be added to the Spotify developer dashboard
  spotifyApi.setRedirectURI(redirectUri);

  try {
    if (!accessToken && !ctx.params.code) {
      return ctx.redirect({ url: getAuthUrl(redirectUri) });
    }

    if (ctx.params.code) {
      // returning from the OAuth flow; request an access token
      const tokens = await spotifyApi.authorizationCodeGrant(
        String(ctx.params.code)
      );

      accessToken = tokens.body.access_token;
    }

    await checkAuth();

    // `state` will be the action name to redirect to after auth
    if (ctx.params.state) {
      return ctx.redirect({ action: String(ctx.params.state) });
    }
  } catch (error) {
    // console.error(error);

    // start over
    return ctx.redirect({ url: getAuthUrl(redirectUri) });
  }
}

function getAuthUrl(redirectUri: string) {
  // Generate a URL for the user to visit to authorize the app
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.SPOTIFY_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: spotifyScopes.join(" "),
  });

  const returnTo =
    "returnTo" in ctx.params ? String(ctx.params.returnTo) : undefined;

  if (returnTo) {
    params.set("state", returnTo);
  }

  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}
