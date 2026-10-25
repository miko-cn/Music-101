import type { PitchClass } from "../theory/pitch.ts";
import type { ScaleId } from "../theory/scale.ts";
import type { TrackRole } from "../midi/project.ts";
import { PPQ } from "../midi/types.ts";
import { THRESHOLDS } from "./thresholds.ts";

export interface AnalysisNote {
  tick: number;
  dur: number;
  pitch: number;
  vel: number;
}

export interface AnalysisTrack {
  role: TrackRole;
  notes: AnalysisNote[];
}

export interface AnalysisSection {
  name: string;
  startBar: number;
  bars: number;
}

export interface AnalysisSong {
  keyRoot: PitchClass;
  keyScale: ScaleId;
  beatsPerBar: number;
  totalBars: number;
  /** 关卡 8 之后，借用和弦（♭VII、iv 等）视为合法。 */
  allowBorrowed: boolean;
  sections: AnalysisSection[];
  tracks: AnalysisTrack[];
}

export function barLengthTicks(song: Pick<AnalysisSong, "beatsPerBar">, ppq = PPQ): number {
  return song.beatsPerBar * ppq;
}

export function noteOverlapsBar(note: AnalysisNote, bar: number, barTicks: number): boolean {
  const start = bar * barTicks;
  const end = start + barTicks;
  return note.tick < end && note.tick + note.dur > start;
}

export function isDecorative(role: TrackRole): boolean {
  return (THRESHOLDS.decorativeRoles as readonly string[]).includes(role);
}

export function notesInBar(song: AnalysisSong, bar: number): { role: TrackRole; note: AnalysisNote }[] {
  const barTicks = barLengthTicks(song);
  const found: { role: TrackRole; note: AnalysisNote }[] = [];
  for (const track of song.tracks) {
    for (const note of track.notes) {
      if (noteOverlapsBar(note, bar, barTicks)) found.push({ role: track.role, note });
    }
  }
  return found;
}

/** 一小节里出现过的音级，按音级去重。装饰轨不算。 */
export function pitchClassesInBar(song: AnalysisSong, bar: number): number[] {
  const classes = new Set<number>();
  for (const item of notesInBar(song, bar)) {
    if (isDecorative(item.role)) continue;
    classes.add(((item.note.pitch % 12) + 12) % 12);
  }
  return [...classes].sort((a, b) => a - b);
}
