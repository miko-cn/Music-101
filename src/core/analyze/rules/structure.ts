import type { DiagnosticRule } from "../types.ts";
import { THRESHOLDS } from "../thresholds.ts";
import { pitchClassesInBar, type AnalysisSong } from "../song.ts";

export function structureRule(): DiagnosticRule<AnalysisSong> {
  return {
    id: "structure",
    check: (song) => {
      const found = [];
      if (song.sections.length === 0) {
        found.push({
          id: "structure-markers",
          severity: "warning" as const,
          bar: 0,
          message: "没有段落标记。主歌、副歌需要标出来，后面的能量规则才知道抬哪一段。",
        });
      }
      const signature = (bar: number) => pitchClassesInBar(song, bar).join(",");
      let runStart = 0;
      let run = 1;
      let reported = false;
      for (let bar = 1; bar < song.totalBars; bar += 1) {
        if (signature(bar) === signature(bar - 1) && signature(bar) !== "") {
          run += 1;
        } else {
          runStart = bar;
          run = 1;
        }
        if (!reported && run >= THRESHOLDS.staleRunBars) {
          const at = runStart + THRESHOLDS.staleRunBars - 1;
          found.push({
            id: "structure-stale",
            severity: "warning" as const,
            bar: at,
            message: `第 ${at + 1} 小节起失去新鲜感：同一个和声已经连续重复了 ${THRESHOLDS.staleRunBars} 小节。`,
          });
          reported = true;
        }
      }
      return found;
    },
  };
}
