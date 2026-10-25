import type { PitchClass } from "../theory/pitch.ts";

/**
 * 白键在主键区，黑键在上面一排，跳过 E–F 和 B–C 之间没有黑键的空档。
 * A S D F G H J = C D E F G A B
 * W E   T Y U   = C# D#  F# G# A#
 */
const KEY_MAP: readonly { key: string; pitch: PitchClass; label: string }[] = [
  { key: "a", pitch: 0, label: "A" },
  { key: "w", pitch: 1, label: "W" },
  { key: "s", pitch: 2, label: "S" },
  { key: "e", pitch: 3, label: "E" },
  { key: "d", pitch: 4, label: "D" },
  { key: "f", pitch: 5, label: "F" },
  { key: "t", pitch: 6, label: "T" },
  { key: "g", pitch: 7, label: "G" },
  { key: "y", pitch: 8, label: "Y" },
  { key: "h", pitch: 9, label: "H" },
  { key: "u", pitch: 10, label: "U" },
  { key: "j", pitch: 11, label: "J" },
];

/** 琴键上印的电脑键帽。没有对应键时返回 null。 */
export function computerKeyLabel(pitch: PitchClass): string | null {
  return KEY_MAP.find((item) => item.pitch === pitch)?.label ?? null;
}

/** 当前八度下这个电脑键对应的 MIDI 音高。不是音键时返回 null。 */
export function lessonKeyToMidi(key: string, octave: number): number | null {
  const found = KEY_MAP.find((item) => item.key === key.toLowerCase());
  if (!found) return null;
  const midi = (octave + 1) * 12 + found.pitch;
  if (midi < 0 || midi > 127) return null;
  return midi;
}

/**
 * Z 低一个八度，X 高一个八度。
 * W / E 已经拿去弹黑键，不再负责换八度。
 */
export function lessonOctaveKey(key: string, octave: number): number | null {
  const name = key.toLowerCase();
  if (name === "z") return Math.max(0, octave - 1);
  if (name === "x") return Math.min(8, octave + 1);
  return null;
}
