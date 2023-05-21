import { Action, io } from "@interval/sdk";
import { requireSpotifyAuth } from "../../auth";
import { requireParam, sleep } from "../../util";
import prisma from "../../prisma";
import spotifyApi, {
  cachePlaylistTracks,
  collectAndCachePlaylistTracks,
  collectTracksFromPlaylist,
} from "../../spotify";

export default new Action({
  name: "Add track to playlist",
  unlisted: true,
  handler: async () => {
    await requireSpotifyAuth();

    const trackId = requireParam("trackId");

    const track = await spotifyApi.getTrack(trackId);

    const allPlaylists = await prisma.playlist.findMany({
      orderBy: { createdAt: "asc" },
    });

    const { playlists } = await io.group({
      cover: io.display.image("", {
        url: track.body.album.images[0]?.url,
        size: "thumbnail",
      }),
      track: io.display.markdown(
        `**${track.body.name}**  \n${track.body.artists
          .map((a) => a.name)
          .join(", ")} `
      ),
      playlists: io
        .search("Select playlist(s)", {
          initialResults: allPlaylists,
          renderResult: (p) => `${p.isFavorite ? "⭐ " : ""}${p.name}`,
          onSearch: async (query) => {
            return allPlaylists.filter((p) =>
              p.name.toLowerCase().includes(query.toLowerCase())
            );
          },
        })
        .multiple(),
    });

    for (const { id, name } of playlists) {
      // check if track is already in playlist
      const playlistTracks = await collectTracksFromPlaylist({ id });

      if (playlistTracks.some((t) => t.track.id === trackId)) {
        await io.display.markdown(`Track is already in ${name}, skipping`);
        continue;
      }

      await spotifyApi.addTracksToPlaylist(id, [`spotify:track:${trackId}`]);

      // wait for spotify to update
      await sleep(1000);

      await collectAndCachePlaylistTracks({ id, name });

      await io.display.markdown(`Added track to ${name}`);
    }
  },
});
