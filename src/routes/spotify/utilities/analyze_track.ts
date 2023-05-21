import { io, Layout, Page } from "@interval/sdk";
import { requireSpotifyPageAuth } from "../../../auth";
import spotifyApi from "../../../spotify";
import {
  numericKeyToString,
  requireParam,
  secondsToMinutes,
} from "../../../util";

export default new Page({
  name: "Track analysis",
  unlisted: true,
  handler: async () => {
    await requireSpotifyPageAuth();

    const trackId = requireParam("trackId");

    const [track, audioFeatures, analysis, recommendations] = await Promise.all(
      [
        spotifyApi.getTrack(trackId),
        spotifyApi.getAudioFeaturesForTrack(trackId),
        spotifyApi.getAudioAnalysisForTrack(trackId),
        spotifyApi.getRecommendations({
          seed_tracks: [trackId],
        }),
      ]
    );

    return new Layout({
      title: track.body.name,
      description: `Song by ${track.body.artists
        .map((a) => a.name)
        .join(", ")}`,
      menuItems: [
        {
          label: "Listen on Spotify",
          url: track.body.uri,
          theme: "primary",
        },
      ],
      children: [
        // io.display.heading("Audio features", {
        //   level: 3,
        // }),
        io.display.metadata("", {
          layout: "card",
          data: [
            {
              label: "Key",
              value: numericKeyToString(audioFeatures.body.key),
            },
            {
              label: "Tempo",
              value: `${Math.round(audioFeatures.body.tempo)} BPM`,
            },
            {
              label: "Time signature",
              value: audioFeatures.body.time_signature,
            },
            {
              label: "Duration",
              value: secondsToMinutes(audioFeatures.body.duration_ms / 1000),
            },
          ],
        }),
        io.display.heading("Audio analysis", {
          level: 3,
        }),
        io.display.metadata("", {
          layout: "grid",
          // @ts-ignore - typings not present
          data: Object.keys(analysis.body.track)
            .filter((key) => {
              if (key === "key") return false;
              // @ts-ignore - typings not present
              return typeof analysis.body.track[key] === "number";
            })
            .map((label) => ({
              label,
              // @ts-ignore - typings not present
              value: analysis.body.track[label],
            })),
        }),
        io.display.heading("Recommended tracks", {
          level: 3,
        }),
        io.display.table("", {
          data: recommendations.body.tracks,
          columns: [
            {
              label: "Name",
              renderCell: (row) => ({
                label: row.name,
                url: row.uri,
              }),
            },
            {
              label: "Artists",
              renderCell: (track) =>
                track.artists.map((a) => a.name).join(", "),
            },
            {
              label: "Listen",
              renderCell: (row) => ({
                label: "Listen on Spotify",
                url: row.uri,
              }),
            },
          ],
          rowMenuItems: (row) => [
            {
              label: "Listen on Spotify",
              url: row.uri,
            },
            {
              label: "Analyze",
              action: `spotify/utilities/analyze_track`,
              params: { trackId: row.id },
            },
          ],
        }),
      ],
    });
  },
});
