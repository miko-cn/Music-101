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

/** 这个电脑键是不是音键（跟当前八度无关）。 */
export function isNoteKey(key: string): boolean {
  return KEY_MAP.some((item) => item.key === key.toLowerCase());
}

/**
 * 电脑键的一次按下/松开，该做什么。
 *
 * 规则集中在这里，UI 只负责执行——
 * 这样「按住的音要跟住按住时长」这条不会被某个组件写错。
 */
export type ComputerKeyAction =
  /** 换八度。 */
  | { kind: "octave"; octave: number }
  /** 按下音键：起音。 */
  | { kind: "press"; key: string; midi: number }
  /** 松开音键：制音。 */
  | { kind: "release"; key: string };

/**
 * 把一次键盘事件翻译成动作。
 *
 * 两条容易写错的规矩，这里定死：
 *
 * 1. 长按的自动重复（keydown 反复触发）不重新起音——
 *    否则按住不放会变成一个音被反复打断重响。
 * 2. 松手时只认「这是不是音键」，不看当前八度。
 *    按着音的时候按 Z / X 换八度，松手那一刻算出来的音高已经变了，
 *    按音高去匹配就会找不到当初按下的那个音，音会一直拖下去。
 */
export function computerKeyAction(input: {
  key: string;
  octave: number;
  down: boolean;
  repeat?: boolean;
}): ComputerKeyAction | null {
  const name = input.key.toLowerCase();

  if (!input.down) {
    if (!isNoteKey(input.key)) return null;
    return { kind: "release", key: name };
  }

  const nextOctave = lessonOctaveKey(input.key, input.octave);
  if (nextOctave !== null) return { kind: "octave", octave: nextOctave };

  const midi = lessonKeyToMidi(input.key, input.octave);
  if (midi === null) return null;
  if (input.repeat) return null;
  return { kind: "press", key: name, midi };
}
