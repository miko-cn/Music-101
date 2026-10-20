import { THRESHOLDS } from "./thresholds.ts";
import { isDecorative, notesInBar, type AnalysisSong } from "./song.ts";

export interface BarEnergy {
  bar: number;
  layers: number;
  /** 这一小节的最低音。没有音时是 null。 */
  lowest: number | null;
  meanVelocity: number;
  energy: number;
}

export function registerWeight(lowestPitch: number): number {
  if (lowestPitch < THRESHOLDS.lowRegisterBelow) return THRESHOLDS.lowWeight;
  if (lowestPitch < THRESHOLDS.midRegisterBelow) return THRESHOLDS.midWeight;
  return THRESHOLDS.highWeight;
}

export function energySeries(song: AnalysisSong): BarEnergy[] {
  return Array.from({ length: song.totalBars }, (_, bar) => {
    const sounding = notesInBar(song, bar).filter((item) => !isDecorative(item.role));
    const roles = new Set(sounding.map((item) => item.role));
    const layers = roles.size;
    if (sounding.length === 0) {
      return { bar, layers: 0, lowest: null, meanVelocity: 0, energy: 0 };
    }
    const lowest = Math.min(...sounding.map((item) => item.note.pitch));
    const meanVelocity = sounding.reduce((sum, item) => sum + item.note.vel, 0) / sounding.length;
    const energy = layers * registerWeight(lowest) * meanVelocity;
    return { bar, layers, lowest, meanVelocity, energy };
  });
}

export function isVerseName(name: string): boolean {
  return /verse|主歌/i.test(name);
}

export function isChorusName(name: string): boolean {
  return /chorus|副歌/i.test(name) && !/pre/i.test(name);
}

export function sectionBars(song: AnalysisSong, match: (name: string) => boolean): number[] {
  const bars: number[] = [];
  for (const section of song.sections) {
    if (!match(section.name)) continue;
    for (let offset = 0; offset < section.bars; offset += 1) {
      const bar = section.startBar + offset;
      if (bar >= 0 && bar < song.totalBars) bars.push(bar);
    }
  }
  return bars;
}

export function average(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
