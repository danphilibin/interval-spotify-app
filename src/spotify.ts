import { ctx } from "@interval/sdk";
import SpotifyWebApi from "spotify-web-api-node";
import { getDateString, getSetting, monthNames, sleep } from "./util";
import prisma from "./prisma";

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
});

// to save time in other places, we'll format all fetched tracks into this shape
type SpotifyTrackObject = {
  id: string;
  name: string;
  artists: string[];
  album: string;
  coverImage?: string;
  spotifyUri: string;
};

export const SPOTIFY_MAX_LIMIT = 50;

function convertTrackObjects(
  tracks: SpotifyApi.TrackObjectFull[]
): SpotifyTrackObject[] {
  return tracks.map((track) => ({
    id: track.id,
    name: track.name,
    artists: track.artists.map((a) => a.name),
    album: track.album.name,
    coverImage: track.album.images[0]?.url,
    spotifyUri: track.uri,
  }));
}

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
        new Date(t.added_at).getMonth() === month &&
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
        lastTrackDate.getMonth() < month &&
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

export async function collectTracksFromPlaylist({
  playlistId,
}: {
  playlistId: string;
}) {
  const allTracks: SpotifyTrackObject[] = [];
  let total = 0;
  let hasMore = true;

  ctx.loading.start("Fetching tracks from playlist...");

  while (hasMore) {
    const offset = allTracks.length;

    const tracks = await spotifyApi.getPlaylistTracks(playlistId, {
      limit: SPOTIFY_MAX_LIMIT,
      offset,
    });

    total = tracks.body.total;

    ctx.loading.update({ description: `Fetched ${offset} of ${total}` });

    hasMore = tracks.body.next !== null;

    // avoid rate limiting
    await sleep(1000);

    allTracks.push(
      ...convertTrackObjects(tracks.body.items.map((item) => item.track))
    );
  }

  return allTracks;
}

export async function collectPlaylists({ cache = false }: { cache?: boolean }) {
  const items: SpotifyApi.PlaylistObjectSimplified[] = [];
  let total = 0;
  let offset = 0;
  let hasMore = true;

  ctx.loading.start("Fetching playlists...");

  const userId = await getSetting("spotifyUserId");

  while (hasMore) {
    const playlists = await spotifyApi.getUserPlaylists({
      limit: SPOTIFY_MAX_LIMIT,
      offset,
    });

    offset += playlists.body.items.length;
    total = playlists.body.total;

    ctx.loading.update({ description: `Fetched ${offset} of ${total}` });

    hasMore = playlists.body.next !== null;

    const selfPlaylists = playlists.body.items.filter(
      (playlist) => playlist.owner.id === userId
    );

    items.push(...selfPlaylists);

    // avoid rate limiting
    await sleep(1000);
  }

  if (cache) {
    ctx.loading.update({ description: `Caching data...` });

    for (const playlist of items) {
      await prisma.playlist.upsert({
        where: { id: playlist.id },
        update: {
          name: playlist.name,
          public: playlist.public,
          collaborative: playlist.collaborative,
          total: playlist.tracks.total,
          description: playlist.description,
        },
        create: {
          id: playlist.id,
          name: playlist.name,
          public: playlist.public,
          collaborative: playlist.collaborative,
          total: playlist.tracks.total,
          description: playlist.description,
        },
      });
    }
  }

  return items;
}

export default spotifyApi;
