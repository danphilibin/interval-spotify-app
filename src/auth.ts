import { ctx, io, Layout } from "@interval/sdk";
import spotifyApi from "./spotify";
import fs from "fs";
import { sleep, spotifyScopes } from "./util";
import path from "path";
import prisma from "./prisma";

export const accessTokens: Record<string, string> =
  getAccessTokenFromFileSystem() ?? {};

export const AUTHORIZE_ACTION_NAME = "spotify/authorize";

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

function writeAccessTokenToFileSystem(tokens: typeof accessTokens) {
  // write the access token to the file system, so it can be reused between server restarts.
  // this is not a secure way to store access tokens, but it's fine for this demo
  fs.writeFileSync(
    path.join(__dirname, "../.access-token"),
    JSON.stringify(tokens)
  );
}

function getAccessTokenFromFileSystem() {
  if (process.env.NODE_ENV !== "development") return null;
  try {
    const tokens = fs.readFileSync(
      path.join(__dirname, "../.access-token"),
      "utf8"
    );
    if (tokens) return JSON.parse(tokens);
  } catch (error) {}
  return null;
}

export async function checkAuth(): Promise<boolean> {
  if (!accessTokens[ctx.user.email]) return false;

  try {
    spotifyApi.setAccessToken(accessTokens[ctx.user.email]);

    const meReq = await spotifyApi.getMe();

    if (meReq.statusCode === 200) {
      const existingId = await prisma.settings.findFirst({
        where: { name: "spotifyUserId" },
      });

      if (existingId && existingId.value !== meReq.body.id) {
        throw new Error(
          "Looks like you're trying to log into a different Spotify account than the one you've previously authorized. Please log out of Spotify and try again, or create a new Interval organization for the new account."
        );
      }

      await prisma.settings.upsert({
        where: { name: "spotifyUserId" },
        create: { name: "spotifyUserId", value: meReq.body.id },
        update: { value: meReq.body.id },
      });

      await prisma.settings.upsert({
        where: { name: "spotifyDisplayName" },
        create: { name: "spotifyDisplayName", value: meReq.body.display_name },
        update: { value: meReq.body.display_name },
      });

      return true;
    }

    return false;
  } catch (error) {
    if (
      error.message.startsWith(
        "Looks like you're trying to log into a different Spotify account"
      )
    ) {
      throw error;
    }

    writeAccessTokenToFileSystem({});
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
  // const dashboardUrl = `http://localhost:3000/dashboard/${
  //   ctx.organization.slug
  // }/${ctx.environment === "development" ? "develop/actions" : "actions"}`;

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

    accessTokens[ctx.user.email] = tokens.body.access_token;
    writeAccessTokenToFileSystem(accessTokens);

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

// loading and redirect APIs aren't available within pages, so we just return a page with an error
export async function requireSpotifyPageAuth() {
  if (!(await checkAuth())) {
    return new Layout({
      title: "Spotify",
      children: [
        io.display.markdown("Please authorize with Spotify to continue"),
        io.display.link("Authorize with Spotify", {
          route: AUTHORIZE_ACTION_NAME,
        }),
      ],
    });
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

  if (ctx.action.slug !== AUTHORIZE_ACTION_NAME) {
    params.set("state", ctx.action.slug);
  }

  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}
