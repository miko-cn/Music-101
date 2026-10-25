import { midiToFrequency } from "../../theory/pitch.ts";
import type { DiagnosticRule } from "../types.ts";
import { THRESHOLDS } from "../thresholds.ts";
import { isDecorative, notesInBar, type AnalysisSong, type AnalysisTrack } from "../song.ts";

export interface TrackCentroid {
  role: AnalysisTrack["role"];
  hz: number;
}

export function trackCentroid(track: AnalysisTrack): number | null {
  let weight = 0;
  let sum = 0;
  for (const note of track.notes) {
    const vel = Math.max(note.vel, 1);
    sum += midiToFrequency(note.pitch) * vel;
    weight += vel;
  }
  if (weight === 0) return null;
  return sum / weight;
}

function inMidBand(hz: number): boolean {
  return hz >= THRESHOLDS.midBandLowHz && hz <= THRESHOLDS.midBandHighHz;
}

export function spectrumRule(): DiagnosticRule<AnalysisSong> {
  return {
    id: "spectrum",
    check: (song) => {
      const centroids: TrackCentroid[] = [];
      for (const track of song.tracks) {
        if (isDecorative(track.role)) continue;
        const hz = trackCentroid(track);
        if (hz === null || !inMidBand(hz)) continue;
        centroids.push({ role: track.role, hz });
      }
      const found = [];
      for (let left = 0; left < centroids.length; left += 1) {
        for (let right = left + 1; right < centroids.length; right += 1) {
          const a = centroids[left];
          const b = centroids[right];
          if (!a || !b) continue;
          if (Math.abs(a.hz - b.hz) >= THRESHOLDS.centroidClashHz) continue;
          const bar = firstSharedBar(song, a.role, b.role);
          found.push({
            id: `spectrum-${a.role}-${b.role}`,
            severity: "warning" as const,
            bar,
            message: `${a.role} 和 ${b.role} 的频率重心都在中频（约 ${Math.round(a.hz)}Hz / ${Math.round(b.hz)}Hz），挤在一起。`,
          });
        }
      }
      return found;
    },
  };
}

function firstSharedBar(song: AnalysisSong, roleA: string, roleB: string): number {
  for (let bar = 0; bar < song.totalBars; bar += 1) {
    const roles = new Set(notesInBar(song, bar).map((item) => item.role));
    if (roles.has(roleA as AnalysisTrack["role"]) && roles.has(roleB as AnalysisTrack["role"])) return bar;
  }
  return 0;
}
