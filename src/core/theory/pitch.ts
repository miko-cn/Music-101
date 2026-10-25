export type PitchClass = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

export const SHARP_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;
export const FLAT_NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"] as const;

/**
 * 字母到「以 C 为基准的半音偏移」的对照表。
 * 故意声明成 `number | undefined`：只有这样，下面 `base === undefined` 的防御性检查
 * 才是编译器可见的真检查，而不是永远为假的死代码。
 */
const LETTERS = ["C", "D", "E", "F", "G", "A", "B"] as const;
const LETTER_SEMITONE = [0, 2, 4, 5, 7, 9, 11] as const;
const LETTER_INDEX: Record<string, number | undefined> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** 黑键对应的音级集合（C#、D#、F#、G#、A#）。提到模块级常量，避免每次调用都新建数组。 */
const BLACK_KEY_PITCH_CLASSES: readonly number[] = [1, 3, 6, 8, 10];

/**
 * 把 MIDI 音高映射到 0-11 的音级。
 * 非整数输入会一路走到音名查表并拼出 "undefined4" 之类的垃圾结果，所以在这里直接拒绝。
 */
export function midiToPitchClass(midi: number): PitchClass {
  if (!Number.isInteger(midi)) throw new Error(`MIDI 音高必须是整数: ${midi}`);
  // JS 的 `%` 对负数返回负余数（-1 % 12 === -1），单次取模会得到负音级；
  // 先 +12 再取一次模，才能把负音高稳定折回 0-11。
  return ((((midi % 12) + 12) % 12) as PitchClass);
}

export function pitchClassToName(pitchClass: number, preferFlat = false): string {
  const pc = midiToPitchClass(pitchClass);
  return preferFlat ? FLAT_NAMES[pc] : SHARP_NAMES[pc];
}

/**
 * 按「主音字母 + 音级跨度」拼写一个音，而不是按音级查固定的升号/降号表。
 *
 * 主音用升号还是降号由 `preferFlat` 决定（F# / Gb）。其余音保持和弦或音阶该有的字母：
 * F# 大七的七音是 E#，不是 F；Gb 大调的四级是 Cb，不是 B。
 * 重升记成 `##` 或解析时的 `x`，重降记成 `bb`。
 */
export function spellStackedPitch(
  root: number,
  semitones: number,
  letterOffset: number,
  preferFlat = false,
): string {
  if (!Number.isInteger(semitones) || !Number.isInteger(letterOffset)) {
    throw new Error(`音程必须是整数: ${semitones}, ${letterOffset}`);
  }
  const rootPitchClass = midiToPitchClass(root);
  const tonicName = pitchClassToName(rootPitchClass, preferFlat);
  const tonicLetter = LETTERS.indexOf(tonicName[0] as (typeof LETTERS)[number]);
  if (tonicLetter < 0) throw new Error(`无法解析的主音: ${tonicName}`);
  const letterIndex = (((tonicLetter + letterOffset) % 7) + 7) % 7;
  const targetPitchClass = midiToPitchClass(rootPitchClass + semitones);
  let accidental = targetPitchClass - LETTER_SEMITONE[letterIndex];
  if (accidental > 6) accidental -= 12;
  if (accidental < -6) accidental += 12;
  const letter = LETTERS[letterIndex];
  if (accidental === 0) return letter;
  if (accidental > 0) return `${letter}${"#".repeat(accidental)}`;
  return `${letter}${"b".repeat(-accidental)}`;
}

export function midiToNoteName(midi: number, preferFlat = false): string {
  // 负八度必须用 floor 而不是截断：Math.floor(-1 / 12) === -1，截断会得到 0，
  // 把 B-2 错算成 B-1；floor 才能让 C-1 落在 MIDI 0 上。
  const octave = Math.floor(midi / 12) - 1;
  return `${pitchClassToName(midi, preferFlat)}${octave}`;
}

/**
 * 把音名解析为 MIDI 音高。
 * 不对 MIDI 0-127 以外的音名做隐式纠正（不静默折返），超范围直接抛错，
 * 以免下游拿到一个「看起来正常但其实是错的」音高。
 */
export function noteNameToMidi(noteName: string): number {
  const match = /^([A-Ga-g])([#bx]*)(-?\d+)$/.exec(noteName.trim());
  if (!match) throw new Error(`无法解析的音名: ${noteName}`);
  const base = LETTER_INDEX[match[1].toUpperCase()];
  if (base === undefined) throw new Error(`无法解析的音名: ${noteName}`);
  const accidental = accidentalValue(match[2] ?? "");
  const octave = Number(match[3]);
  // 变化音按线性半音数叠加，不能折回同一八度：
  // Cb4 = B3 = 59、B#3 = C4 = 60、F#3 = 54、Bb2 = 46、C-1 = 0。
  const midi = (octave + 1) * 12 + base + accidental;
  if (midi < 0 || midi > 127) throw new Error(`音名超出 MIDI 范围(0-127): ${noteName}`);
  return midi;
}

/** `#` 升半音，`b` 降半音，`x` 是重升（两个升号）。 */
function accidentalValue(token: string): number {
  let value = 0;
  for (const mark of token) {
    if (mark === "#") value += 1;
    else if (mark === "b") value -= 1;
    else if (mark === "x") value += 2;
  }
  return value;
}

export function isBlackKey(pitchClass: number): boolean {
  return BLACK_KEY_PITCH_CLASSES.includes(midiToPitchClass(pitchClass));
}

export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}
