import { ctx } from "@interval/sdk";
import prisma from "./prisma";

export function splitArrayIntoBatches(array: any[], size: number) {
  const batches = [];
  for (let i = 0; i < array.length; i += size) {
    batches.push(array.slice(i, i + size));
  }
  return batches;
}

export function requireParam(param: string) {
  if (!(param in ctx.params)) {
    throw new Error(`Missing required parameter: ${param}`);
  }
  return String(ctx.params[param]);
}

export const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getDateString(date: Date) {
  return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
}

export function getRelativeDateString(date: Date) {
  const formatter = new Intl.RelativeTimeFormat("en", {
    numeric: "auto",
  });

  const diff = Math.round((Date.now() - date.getTime()) / 1000);
  if (diff < 60) {
    return formatter.format(-diff, "second");
  }

  const diffMinutes = Math.round(diff / 60);
  if (diffMinutes < 60) {
    return formatter.format(-diffMinutes, "minute");
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return formatter.format(-diffHours, "hour");
  }

  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 30) {
    return formatter.format(-diffDays, "day");
  }

  const diffMonths = Math.round(diffDays / 30);
  if (diffMonths < 12) {
    return formatter.format(-diffMonths, "month");
  }

  const diffYears = Math.round(diffMonths / 12);
  return formatter.format(-diffYears, "year");
}

// https://developer.spotify.com/documentation/general/guides/scopes/#scopes
export const spotifyScopes = [
  "user-library-read",
  "user-library-modify",
  "user-read-private",
  "user-read-recently-played",
  // "user-read-playback-position",
  // "user-read-playback-state",
  // "user-read-currently-playing",
  // "user-modify-playback-state",
  "playlist-modify-public",
  "playlist-modify-private",
  "playlist-read-private",
  "playlist-read-collaborative",
  "user-top-read",
];

type Settings = "spotifyDisplayName" | "spotifyUserId";

export async function getSetting(name: Settings) {
  const setting = await prisma.settings.findUnique({
    where: { name },
  });

  if (!setting) {
    throw new Error(`Setting not found: ${name}`);
  }

  return setting.value;
}
