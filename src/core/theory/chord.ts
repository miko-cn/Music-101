import { midiToPitchClass, spellStackedPitch, type PitchClass } from "./pitch.ts";

/** 支持的和弦性质。 */
export type ChordQuality =
  | "maj"
  | "min"
  | "dim"
  | "aug"
  | "maj7"
  | "min7"
  | "dom7"
  | "sus2"
  | "sus4"
  | "add9"
  | "m7b5"
  | "dim7";

/** 一个和弦：根音（音级 0-11）+ 性质。 */
export interface Chord {
  root: PitchClass;
  quality: ChordQuality;
}

/**
 * 各性质相对根音的半音偏移。
 * 偏移可以超过 11（add9 的 14），取音级时统一折回 0-11。
 */
export const CHORD_INTERVALS: Record<ChordQuality, readonly number[]> = {
  maj: [0, 4, 7],
  min: [0, 3, 7],
  dim: [0, 3, 6],
  aug: [0, 4, 8],
  maj7: [0, 4, 7, 11],
  min7: [0, 3, 7, 10],
  dom7: [0, 4, 7, 10],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  add9: [0, 4, 7, 14],
  m7b5: [0, 3, 6, 10],
  dim7: [0, 3, 6, 9],
};

/** 和弦性质的中文名称，用于界面展示。 */
export const CHORD_LABELS: Record<ChordQuality, string> = {
  maj: "大三和弦",
  min: "小三和弦",
  dim: "减三和弦",
  aug: "增三和弦",
  maj7: "大七和弦",
  min7: "小七和弦",
  dom7: "属七和弦",
  sus2: "挂留二度",
  sus4: "挂留四度",
  add9: "加九和弦",
  m7b5: "半减七和弦",
  dim7: "减七和弦",
};

/**
 * 匹配顺序即优先级：越具体的和弦越靠前。
 * 例如同样是「根音 + 大三 + 纯五」，add9 / maj7 / dom7 的音更多，
 * 应该先于三和弦被识别出来，否则所有七和弦都会被误判成大三和弦。
 */
export const CHORD_MATCH_ORDER: readonly ChordQuality[] = [
  "add9",
  "maj7",
  "dom7",
  "min7",
  "m7b5",
  "dim7",
  "sus4",
  "sus2",
  "dim",
  "aug",
  "maj",
  "min",
];

/**
 * 每个和弦音相对根音的字母跨度（0 = 根音字母）。
 * 三和弦是三度叠置（+2、+4），七和弦再加七度（+6）。
 * 挂留二度是二度（+1），挂留四度是四度（+3），加九是九度（+8）。
 */
const CHORD_LETTER_OFFSETS: Record<ChordQuality, readonly number[]> = {
  maj: [0, 2, 4],
  min: [0, 2, 4],
  dim: [0, 2, 4],
  aug: [0, 2, 4],
  maj7: [0, 2, 4, 6],
  min7: [0, 2, 4, 6],
  dom7: [0, 2, 4, 6],
  sus2: [0, 1, 4],
  sus4: [0, 3, 4],
  add9: [0, 2, 4, 8],
  m7b5: [0, 2, 4, 6],
  dim7: [0, 2, 4, 6],
};

/** 取得和弦包含的全部音级（0-11），按从根音向上的顺序排列。 */
export function getChordPitches(chord: Chord): PitchClass[] {
  return CHORD_INTERVALS[chord.quality].map((offset) => midiToPitchClass(chord.root + offset));
}

/** 按和弦结构拼写和弦音。F#maj7 → F# A# C# E#，不把七音写成 F。 */
export function spellChordTones(chord: Chord, preferFlat = false): string[] {
  const semitones = CHORD_INTERVALS[chord.quality];
  const letters = CHORD_LETTER_OFFSETS[chord.quality];
  return semitones.map((interval, index) => {
    const letterOffset = letters[index];
    if (letterOffset === undefined) throw new Error(`和弦 ${chord.quality} 缺少第 ${index} 个字母跨度`);
    return spellStackedPitch(chord.root, interval, letterOffset, preferFlat);
  });
}

/**
 * 判断一组音高能否构成以 `root` 为根音的和弦。
 * 只比对音级（不区分八度），因此高八度的同名字符也算在内；
 * 只要和弦所需的音全部出现即判定匹配（多余音不阻止匹配）。
 */
export function matchChord(pitches: readonly number[], root: PitchClass): Chord | null {
  const present = new Set(pitches.map(midiToPitchClass));
  for (const quality of CHORD_MATCH_ORDER) {
    const needed = CHORD_INTERVALS[quality].map((offset) => midiToPitchClass(root + offset));
    if (needed.every((pitch) => present.has(pitch))) {
      return { root, quality };
    }
  }
  return null;
}

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"] as const;

/**
 * 参考级数：相对调中心音的固定半音偏移 [0, 2, 4, 5, 7, 9, 11]。
 * 大调与小调都用这套「平行大调」参考，因为流行/摇滚记谱习惯如此
 * （A 小调里的 F 大三和弦记作 ♭VI，而不是理论上的 submediant）。
 */
const DEGREE_OFFSETS = [0, 2, 4, 5, 7, 9, 11] as const;

/** 参考级对应的音级序列（自然级）。 */
function referenceDegrees(keyRoot: PitchClass): PitchClass[] {
  return DEGREE_OFFSETS.map((offset) => midiToPitchClass(keyRoot + offset));
}

/** 按和弦性质决定罗马数字的大小写：小三和弦小写，减三和弦小写并加 °。 */
function applyCase(base: string, quality: ChordQuality): string {
  if (quality === "min" || quality === "min7" || quality === "m7b5") {
    return base.toLowerCase();
  }
  if (quality === "dim" || quality === "dim7") {
    return `${base.toLowerCase()}°`;
  }
  return base;
}

/**
 * 计算和弦在给定调中的罗马数字级数。
 *
 * 规则（与关卡 7/8 的判定一致）：
 * - 根音正好落在第 d 级的参考音上 → 该级罗马数字，按性质决定大小写；
 * - 根音比第 d 级的参考音低半音 → 该级加 ♭ 前缀（借用和弦）；
 * - 都不匹配 → "?"（7 个自然级 + 7 个降半音级已覆盖全部 12 个根音，
 *   所以这个分支实际上不可达，仅作兜底）。
 */
export function romanNumeral(chord: Chord, keyRoot: PitchClass): string {
  const degrees = referenceDegrees(keyRoot);
  const lowered = degrees.map((pitch) => midiToPitchClass(pitch - 1));

  for (let index = 0; index < degrees.length; index += 1) {
    if (degrees[index] === chord.root) {
      return applyCase(ROMAN[index], chord.quality);
    }
  }
  for (let index = 0; index < lowered.length; index += 1) {
    if (lowered[index] === chord.root) {
      return `♭${applyCase(ROMAN[index], chord.quality)}`;
    }
  }
  return "?";
}
