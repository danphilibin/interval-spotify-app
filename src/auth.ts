import { ctx, io, Layout } from "@interval/sdk";
import spotifyApi, { spotifyScopes } from "./spotify";
import { sleep } from "./util";
import prisma from "./prisma";
import { User } from "@prisma/client";

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

export async function getUser(): Promise<User | null> {
  return prisma.user.findUnique({
    where: { intervalEmail: ctx.user.email },
  });
}

export async function requireUser(): Promise<User> {
  const user = await getUser();

  if (!user) {
    throw new Error(
      "You must be logged in to Spotify to use this action. Please log in and try again."
    );
  }

  return user;
}

export async function checkAuth(): Promise<boolean> {
  const user = await getUser();

  if (!user?.accessToken) return false;

  try {
    spotifyApi.setAccessToken(user.accessToken);
    spotifyApi.setRefreshToken(user.refreshToken);

    const meReq = await spotifyApi.getMe();

    if (meReq.statusCode !== 200) {
      console.log("Unable to get user with stored tokens", meReq);

      throw new Error(
        "Looks like you're trying to log into a different Spotify account than the one you've linked to your Interval account. Please log out of Spotify and try again."
      );
    }

    return true;
  } catch (error) {
    if (
      error.message.startsWith(
        "Looks like you're trying to log into a different Spotify account"
      )
    ) {
      throw error;
    }

    // tokens are bad; clear them
    await prisma.user.update({
      where: { id: user.id },
      data: { accessToken: null, refreshToken: null },
    });

    return false;
  }
}

async function ensureUser() {
  const meReq = await spotifyApi.getMe();

  if (meReq.statusCode !== 200) {
    return;
  }

  const existingUser = await prisma.user.findFirst({
    where: { id: meReq.body.id },
  });

  if (existingUser) {
    if (existingUser.id !== meReq.body.id) {
      throw new Error(
        "Looks like you're trying to log into a different Spotify account than the one you've linked to your Interval account . Please log out of Spotify and try again."
      );
    }

    // if we already have a user with this spotify ID but the email is different, kick you out
    if (existingUser.intervalEmail !== ctx.user.email) {
      throw new Error(
        "Your Spotify account is already linked to a different Interval account. Please log out of Spotify and try again."
      );
    }

    // ok
    return existingUser;
  }

  const newUser = await prisma.user.create({
    data: {
      id: meReq.body.id,
      intervalEmail: ctx.user.email,
      displayName: meReq.body.display_name,
    },
  });

  return newUser;
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

    // set API tokens, then fetch user, then sync user with database
    spotifyApi.setAccessToken(tokens.body.access_token);
    spotifyApi.setRefreshToken(tokens.body.refresh_token);

    const user = await ensureUser();

    await prisma.user.update({
      where: { id: user.id },
      data: {
        accessToken: tokens.body.access_token,
        refreshToken: tokens.body.refresh_token,
      },
    });

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
