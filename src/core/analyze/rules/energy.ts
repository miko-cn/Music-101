import type { DiagnosticRule } from "../types.ts";
import type { AnalysisSong } from "../song.ts";
import { average, energySeries, isChorusName, isVerseName, sectionBars } from "../energy.ts";
import { THRESHOLDS } from "../thresholds.ts";

export function energyRule(): DiagnosticRule<AnalysisSong> {
  return {
    id: "energy",
    check: (song) => {
      const series = energySeries(song);
      const verse = sectionBars(song, isVerseName);
      const chorus = sectionBars(song, isChorusName);
      if (verse.length === 0 || chorus.length === 0) {
        return [
          {
            id: "energy-sections",
            severity: "warning",
            message: "没有同时标出主歌和副歌，能量规则无法判断副歌有没有抬层。",
          },
        ];
      }
      const verseEnergy = average(verse.map((bar) => series[bar]?.energy ?? 0));
      const chorusEnergy = average(chorus.map((bar) => series[bar]?.energy ?? 0));
      const verseLayers = average(verse.map((bar) => series[bar]?.layers ?? 0));
      const chorusLayers = average(chorus.map((bar) => series[bar]?.layers ?? 0));
      const lifted =
        chorusEnergy >= verseEnergy * THRESHOLDS.chorusEnergyRatio &&
        chorusLayers >= verseLayers + THRESHOLDS.chorusLayerDelta;
      if (lifted) return [];
      const bar = chorus[0] ?? 0;
      return [
        {
          id: "energy-lift",
          severity: "warning",
          bar,
          message: `副歌没有抬层。主歌能量 ${verseEnergy.toFixed(1)}、层数 ${verseLayers.toFixed(1)}；副歌能量 ${chorusEnergy.toFixed(1)}、层数 ${chorusLayers.toFixed(1)}。需要能量至少到主歌的 ${THRESHOLDS.chorusEnergyRatio} 倍，并且层数多 ${THRESHOLDS.chorusLayerDelta}。`,
        },
      ];
    },
  };
}
