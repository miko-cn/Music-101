import type { DiagnosticRule } from "../types.ts";
import { THRESHOLDS } from "../thresholds.ts";
import { notesInBar, type AnalysisSong } from "../song.ts";

export function lowEndRule(): DiagnosticRule<AnalysisSong> {
  return {
    id: "low-end",
    check: (song) => {
      const found = [];
      for (let bar = 0; bar < song.totalBars; bar += 1) {
        const sounding = notesInBar(song, bar);
        const subPitches = sounding.filter((item) => item.role === "808").map((item) => item.note.pitch);
        const kick = sounding.some((item) => item.role === "KICK");
        if (!kick || subPitches.length === 0) continue;
        const lowest = Math.min(...subPitches);
        if (lowest >= THRESHOLDS.subPitchBelow) continue;
        found.push({
          id: `low-end-${bar}`,
          severity: "warning" as const,
          bar,
          message: `第 ${bar + 1} 小节 808 最低音是 MIDI ${lowest}（低于 ${THRESHOLDS.subPitchBelow}），又和 kick 叠在同一小节。`,
        });
      }
      return found;
    },
  };
}
