import { io, Layout, Page } from "@interval/sdk";
import { requireSpotifyPageAuth } from "../../auth";
import spotifyApi from "../../spotify";
import { requireParam } from "../../util";

export default new Page({
  name: "Track analysis",
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
              action: `spotify/analyzeTrack`,
              params: { trackId: row.id },
            },
          ],
        }),
      ],
    });
  },
});

function secondsToMinutes(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}

function numericKeyToString(key: number): string {
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
