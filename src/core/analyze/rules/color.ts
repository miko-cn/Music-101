import type { DiagnosticRule } from "../types.ts";
import { THRESHOLDS } from "../thresholds.ts";
import { pitchClassesInBar, type AnalysisSong } from "../song.ts";

export function jaccard(left: readonly number[], right: readonly number[]): number {
  const a = new Set(left);
  const b = new Set(right);
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const value of a) {
    if (b.has(value)) intersection += 1;
  }
  const union = a.size + b.size - intersection;
  if (union === 0) return 0;
  return intersection / union;
}

export function colorRule(): DiagnosticRule<AnalysisSong> {
  return {
    id: "color",
    check: (song) => {
      const found = [];
      for (let bar = 0; bar < song.totalBars - 1; bar += 1) {
        const score = jaccard(pitchClassesInBar(song, bar), pitchClassesInBar(song, bar + 1));
        if (score <= THRESHOLDS.chordColorJaccard) continue;
        found.push({
          id: `color-${bar}`,
          severity: "info" as const,
          bar: bar + 1,
          message: `第 ${bar + 1} 与第 ${bar + 2} 小节和声色彩重复（相似度 ${score.toFixed(2)}）。`,
        });
      }
      return found;
    },
  };
}
