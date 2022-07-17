export function splitArrayIntoBatches(array: any[], size: number) {
  const batches = [];
  for (let i = 0; i < array.length; i += size) {
    batches.push(array.slice(i, i + size));
  }
  return batches;
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
];
