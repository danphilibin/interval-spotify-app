import { ctx } from "@interval/sdk";
import spotifyApi from "./spotify";
import { sleep, spotifyScopes } from "./util";

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

export async function checkAuth(): Promise<boolean> {
  if (!accessToken) return false;

  try {
    spotifyApi.setAccessToken(accessToken);
    return (await spotifyApi.getMe()).statusCode === 200;
  } catch (error) {
    return false;
  }
}

export async function requireSpotifyAuth() {
  checkRequiredKeys();

  await ctx.loading.start("Authorizing with Spotify...");

  if (await checkAuth()) return;

  const dashboardUrl = `https://interval.com/dashboard/${
    ctx.organization.slug
  }/${ctx.environment === "development" ? "develop/actions" : "actions"}`;

  // Note: redirecting back to an "authorize" action is necessary because redirect URIs must be
  // whitelisted in Spotify, so we can't redirect straight back to whatever action you were trying to run.
  // This creates a bit of redirection UI jank in Interval, but it's the best we can do for now.
  const redirectUri = dashboardUrl + `/${AUTHORIZE_ACTION_NAME}`;

  // IMPORTANT:
  // 1. This URI must be added to the Spotify developer dashboard.
  // 2. This must be set before requesting `authorizationCodeGrant`.
  spotifyApi.setRedirectURI(redirectUri);

  const authCode = "code" in ctx.params ? String(ctx.params.code) : null;
  const resumeAction = "state" in ctx.params ? String(ctx.params.state) : null;

  if (authCode) {
    const tokens = await spotifyApi.authorizationCodeGrant(authCode);

    accessToken = tokens.body.access_token;

    if (resumeAction) {
      await ctx.redirect({ action: resumeAction });

      // pause execution until the redirect happens; this will kill the transaction
      await sleep(5000);
    }

    return;
  }

  await ctx.redirect({ url: getAuthUrl(redirectUri) });

  // pause execution until the redirect happens; this will kill the transaction
  await sleep(5000);
}

function getAuthUrl(redirectUri: string) {
  // Generate a URL for the user to visit to authorize the app
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.SPOTIFY_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: spotifyScopes.join(" "),
  });

  if (ctx.action.slug !== AUTHORIZE_ACTION_NAME) {
    params.set("state", ctx.action.slug);
  }

  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}
