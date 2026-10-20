import { isInScale } from "../../theory/scale.ts";
import { getChordPitches, matchChord, romanNumeral } from "../../theory/chord.ts";
import { pitchClassToName, type PitchClass } from "../../theory/pitch.ts";
import type { DiagnosticRule } from "../types.ts";
import { pitchClassesInBar, type AnalysisSong } from "../song.ts";

function borrowedOk(song: AnalysisSong, pitchClasses: readonly number[]): boolean {
  if (!song.allowBorrowed || pitchClasses.length === 0) return false;
  for (let root = 0; root < 12; root += 1) {
    const chord = matchChord(pitchClasses, root as PitchClass);
    if (!chord) continue;
    const numeral = romanNumeral(chord, song.keyRoot);
    const borrowed = numeral.startsWith("♭") || numeral === "iv" || numeral === "ii°";
    if (!borrowed) continue;
    const tones = new Set<number>(getChordPitches(chord));
    if (pitchClasses.every((pitch) => tones.has(pitch))) return true;
  }
  return false;
}

export function harmonyRule(): DiagnosticRule<AnalysisSong> {
  return {
    id: "harmony",
    check: (song) => {
      const found = [];
      for (let bar = 0; bar < song.totalBars; bar += 1) {
        const classes = pitchClassesInBar(song, bar);
        const outside = classes.filter((pitch) => !isInScale(pitch, song.keyRoot, song.keyScale));
        if (outside.length === 0) continue;
        if (borrowedOk(song, classes)) continue;
        const names = outside.map((pitch) => pitchClassToName(pitch)).join("、");
        found.push({
          id: `harmony-${bar}`,
          severity: "error" as const,
          bar,
          message: `第 ${bar + 1} 小节有调外音：${names}。`,
        });
      }
      return found;
    },
  };
}
