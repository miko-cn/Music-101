/**
 * 键盘布局：把一段 MIDI 音高排成白键和黑键，并给出各自在键盘上的位置。
 *
 * 纯函数，不碰 DOM，所以可以单测——黑键位置一旦算错，界面上会显示成
 * 白键的音名（例如 F#2 被标成 E2），初学者就会记错位置。
 */

export interface KeySpec {
  midi: number;
  isBlack: boolean;
  /** 白键序号：黑键用它表示「夹在哪两个白键之间」。 */
  whiteIndex: number;
}

/** 一个八度内的 5 个黑键：相对 C 的音高偏移，以及它左边那个白键的序号。 */
const BLACK_KEYS: readonly { midiOffset: number; afterWhite: number }[] = [
  { midiOffset: 1, afterWhite: 0 }, // C#
  { midiOffset: 3, afterWhite: 1 }, // D#
  { midiOffset: 6, afterWhite: 3 }, // F#
  { midiOffset: 8, afterWhite: 4 }, // G#
  { midiOffset: 10, afterWhite: 5 }, // A#
];

/** 一个八度内的 7 个白键：相对 C 的音高偏移。 */
const WHITE_OFFSETS: readonly number[] = [0, 2, 4, 5, 7, 9, 11];

export function keyboardLayout(fromMidi: number, octaves: number): {
  white: KeySpec[];
  black: KeySpec[];
  whiteCount: number;
} {
  const white: KeySpec[] = [];
  const black: KeySpec[] = [];

  for (let octave = 0; octave < octaves; octave += 1) {
    const base = fromMidi + octave * 12;
    WHITE_OFFSETS.forEach((offset, index) => {
      white.push({ midi: base + offset, isBlack: false, whiteIndex: octave * 7 + index });
    });
    BLACK_KEYS.forEach((key) => {
      black.push({
        midi: base + key.midiOffset,
        isBlack: true,
        whiteIndex: octave * 7 + key.afterWhite,
      });
    });
  }

  return { white, black, whiteCount: octaves * 7 };
}

export interface QuizState {
  /** 刚才播的那个音的 MIDI 音高。 */
  midi: number;
  /** 学习者是否已经点了某个键。 */
  answered: boolean;
}

export interface QuizHighlight {
  /** 按音类（0-11）高亮的键。 */
  pitchClasses: ReadonlySet<number>;
  /** 按精确 MIDI 音高高亮的键。 */
  exact: ReadonlySet<number>;
}

const EMPTY_HIGHLIGHT: QuizHighlight = { pitchClasses: new Set(), exact: new Set() };

/**
 * 「听一个音，自己找」测验该高亮哪些键。
 *
 * 没作答时一个键都不能亮——高亮等于把答案直接说出来，测验就废了。
 * 作答之后才把正确的那一个键（精确到具体音高）标出来，同名音（整个音类）
 * 用弱一点的样式一起标出来，顺便复习「同名音每高八度加 1」。
 */
export function quizHighlight(quiz: QuizState | null): QuizHighlight {
  if (!quiz || !quiz.answered) return EMPTY_HIGHLIGHT;
  return {
    pitchClasses: new Set([quiz.midi % 12]),
    exact: new Set([quiz.midi]),
  };
}
