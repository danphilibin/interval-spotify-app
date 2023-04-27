import { Action, io, ctx } from "@interval/sdk";
import spotifyApi from "../../spotify";
import { requireSpotifyAuth } from "../../auth";
import { sleep } from "../../util";

const SPOTIFY_PAGE_LIMIT = 50;

export default new Action({
  name: "Compare playlist with Liked Songs",
  handler: async () => {
    await requireSpotifyAuth();

    const me = await spotifyApi.getMe();
    const myPlaylists = await spotifyApi.getUserPlaylists();

    const playlistOptions = myPlaylists.body.items
      .map((playlist) => ({
        ...playlist,
        label: playlist.name,
        value: playlist.id,
      }))
      .filter((p) => p.owner.id === me.body.id);

    let { playlist, likedSongsMax, likedSongsOffset } = await io.group({
      playlist: io.select.single("Select a playlist to compare", {
        options: playlistOptions,
      }),
      likedSongsMax: io.input.number(
        'Max number of songs to fetch from "Liked Songs"',
        {
          defaultValue: 200,
          max: 500,
          helpText:
            "Spotify can fetch 50 songs at a time. Higher numbers will load more songs but take longer.",
        }
      ),
      likedSongsOffset: io.input.number('Offset for fetching "Liked Songs"', {
        defaultValue: 0,
        helpText:
          "Set this value to skip N songs from the beginning. Helpful for running this against Liked Songs in batches.",
      }),
    });

    await ctx.loading.start({
      title: `Collecting songs from ${playlist.name}...`,
      itemsInQueue: Math.ceil(playlist.tracks.total / SPOTIFY_PAGE_LIMIT),
    });

    const playlistSongs = [];
    let playlistOffset = 0;
    while (playlistOffset < playlist.tracks.total) {
      const songs = await spotifyApi.getPlaylistTracks(playlist.id, {
        limit: SPOTIFY_PAGE_LIMIT,
        offset: playlistOffset,
      });
      playlistSongs.push(...songs.body.items);
      playlistOffset += songs.body.items.length;
      // sleep for 1 second to avoid rate limiting
      await sleep(1000);
      await ctx.loading.completeOne();
    }

    // fetch all of my liked songs
    const likedSongs = [];
    const max = likedSongsMax; // limit for now, because this could take a while
    let offset = likedSongsOffset;
    let hasMore = true;

    await ctx.loading.start({
      title: "Collecting liked songs...",
      itemsInQueue: Math.ceil(max / SPOTIFY_PAGE_LIMIT),
    });

    while (hasMore) {
      const songs = await spotifyApi.getMySavedTracks({
        limit: SPOTIFY_PAGE_LIMIT,
        offset,
      });
      likedSongs.push(...songs.body.items);
      offset += songs.body.items.length;
      // sleep for 1 second to avoid rate limiting
      await sleep(1000);
      await ctx.loading.completeOne();
      hasMore = songs.body.next !== null && likedSongs.length < max;
    }

    // compare the two playlists, find songs in likedSongs that are NOT in playlistSongs
    const songsNotInPlaylist = likedSongs.filter(
      (song) => !playlistSongs.find((pSong) => pSong.track.id === song.track.id)
    );

    const { returnValue: selected, choice } = await io.select
      .table("These songs from Liked Songs are not in the playlist", {
        helpText: `You can add songs to ${playlist.name} by selecting them below.`,
        data: songsNotInPlaylist,
        columns: [
          {
            label: "Title",
            renderCell: (row) => row.track.name,
          },
          {
            label: "Artist",
            renderCell: (row) =>
              row.track.artists.map((a) => a.name).join(", "),
          },
        ],
        rowMenuItems: (row) => [
          {
            label: "Listen on Spotify",
            url: row.track.uri,
          },
        ],
      })
      .withChoices(["Add selected tracks to playlist", "Exit"]);

    // add the selected songs to the playlist
    if (selected.length > 0 && choice === "Add selected tracks to playlist") {
      await spotifyApi.addTracksToPlaylist(
        playlist.id,
        selected.map((song) => song.track.uri)
      );
      return `Added ${selected.length} songs to ${playlist.name}`;
    }
  },
});
