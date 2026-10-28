/**
 * 第 26 关压轴：按教过的规则判骨架，不对一个锁死的 handCorrect。
 *
 * 能过的组装 = 教过的进行（I–V–vi–IV 或 i–♭VI–♭III–♭VII）
 * + 调内 + 教过的色彩（三和弦 / add9 / 七和弦）
 * + 副歌多一层且能量 1.5 倍
 * + 收在 T。
 */
import { energySeries, average } from "../analyze/energy.ts";
import type { AnalysisSong } from "../analyze/song.ts";
import { midiToPitchClass } from "../theory/pitch.ts";
import { getScalePitches } from "../theory/scale.ts";
import type { SkeletonChord } from "../midi/project.ts";

const MAJOR_POP = [0, 7, 9, 5] as const;
const MINOR_AEOLIAN = [9, 5, 0, 7] as const;
const TONIC_ROOTS = new Set([0, 9]);

function sameRoots(left: readonly number[], right: readonly number[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export function chordRoots(chords: readonly SkeletonChord[]): number[] {
  return chords.map((chord) => midiToPitchClass(chord.pitches[0] ?? 0));
}

/** 前四小节是教过的两条进行之一。 */
export function taughtProgression(chords: readonly SkeletonChord[]): boolean {
  if (chords.length < 4) return false;
  const roots = chordRoots(chords).slice(0, 4);
  return sameRoots(roots, MAJOR_POP) || sameRoots(roots, MINOR_AEOLIAN);
}

export type TaughtColor = "triad" | "add9" | "seventh" | "other";

export function chordColor(pitches: readonly number[]): TaughtColor {
  if (pitches.length === 3) return "triad";
  if (pitches.length !== 4) return "other";
  const root = Math.min(...pitches);
  const intervals = new Set(pitches.map((pitch) => (pitch - root) % 12));
  if (intervals.has(2)) return "add9";
  if (intervals.has(10) || intervals.has(11)) return "seventh";
  return "other";
}

export function hasTaughtColor(chords: readonly SkeletonChord[]): boolean {
  return chords.length > 0 && chords.every((chord) => chordColor(chord.pitches) !== "other");
}

/** C 大调音级 = A 自然小调音级。 */
export function inKeyChords(chords: readonly SkeletonChord[]): boolean {
  const scale = new Set(getScalePitches(0, "major"));
  return chords.every((chord) => chord.pitches.every((pitch) => scale.has(midiToPitchClass(pitch))));
}

export function endsOnTonic(chords: readonly SkeletonChord[]): boolean {
  const last = chords[chords.length - 1];
  if (!last) return false;
  return TONIC_ROOTS.has(midiToPitchClass(last.pitches[0] ?? 0));
}

export function chorusLifted(song: AnalysisSong): boolean {
  const series = energySeries(song);
  const verse = series.filter((item) => item.bar >= 4 && item.bar < 8);
  const chorus = series.filter((item) => item.bar >= 8);
  if (verse.length === 0 || chorus.length === 0) return false;
  const verseLayers = average(verse.map((item) => item.layers));
  const chorusLayers = average(chorus.map((item) => item.layers));
  const verseEnergy = average(verse.map((item) => item.energy));
  const chorusEnergy = average(chorus.map((item) => item.energy));
  return chorusLayers >= verseLayers + 1 && chorusEnergy >= verseEnergy * 1.5;
}
