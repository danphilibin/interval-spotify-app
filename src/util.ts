import { ctx } from "@interval/sdk";
import prisma from "./prisma";
import { SettingsName } from "@prisma/client";

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

export async function updateSetting(name: SettingsName, value: string) {
  return prisma.settings.upsert({
    where: { name },
    create: { name, value },
    update: { value },
  });
}

export async function getSetting(name: SettingsName) {
  const setting = await prisma.settings.findUnique({
    where: { name },
  });

  return setting?.value ?? null;
}

export function numericKeyToString(key: number): string {
  switch (key) {
    case 0:
      return "C";
    case 1:
      return "C♯";
    case 2:
      return "D";
    case 3:
      return "D♯";
    case 4:
      return "E";
    case 5:
      return "F";
    case 6:
      return "F♯";
    case 7:
      return "G";
    case 8:
      return "G♯";
    case 9:
      return "A";
    case 10:
      return "A♯";
    case 11:
      return "B";
    default:
      return "Unknown";
  }
}

export function numericKeyToCamelotKey(key: number): string {
  switch (key) {
    case 0:
      return "8B";
    case 1:
      return "3B";
    case 2:
      return "10B";
    case 3:
      return "5B";
    case 4:
      return "12B";
    case 5:
      return "7B";
    case 6:
      return "2B";
    case 7:
      return "9B";
    case 8:
      return "4B";
    case 9:
      return "11B";
    case 10:
      return "6B";
    case 11:
      return "1B";
    default:
      return "Unknown";
  }
}

export function secondsToMinutesString(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}

export function secondsToMinutes(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${remainingSeconds}`;
}
