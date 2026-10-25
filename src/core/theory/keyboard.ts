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

/** 黑键的一组：2 个一组（C# D#）或 3 个一组（F# G# A#）。 */
export interface BlackKeyGroup {
  /** 组里第一个黑键左边的白键序号。 */
  fromWhite: number;
  /** 组里最后一个黑键左边的白键序号。 */
  toWhite: number;
  /** 组里黑键的数量。 */
  size: number;
}

export interface KeyboardLayout {
  white: KeySpec[];
  black: KeySpec[];
  whiteCount: number;
  /** 白键里所有 C 的序号——画「C 在这里」定位点用。 */
  cIndexes: number[];
  /** 白键里所有 F 的序号——画「F 在这里」定位点用。 */
  fIndexes: number[];
  /** 黑键的分组：从黑键的实际位置推出来，不假设八度对齐。 */
  groups: BlackKeyGroup[];
}

/** 一个八度内的 7 个白键：相对 C 的音高偏移。 */
const WHITE_OFFSETS: readonly number[] = [0, 2, 4, 5, 7, 9, 11];

/** 白键的音名（去掉八度号），用来判断是不是 C / F。 */
function isC(midi: number): boolean {
  return midi % 12 === 0;
}

function isF(midi: number): boolean {
  return midi % 12 === 5;
}

/**
 * 从一串白键音高推导出完整布局。
 *
 * 黑键不靠「音高表」硬写，而是靠白键之间的距离推出来：
 * 相邻两个白键差全音（2 个半音）时中间夹一个黑键，差半音（E-F、B-C）时没有。
 * 这样起始音不是 C 也不会错位。
 */
function layoutFromWhite(midis: readonly number[]): KeyboardLayout {
  const white: KeySpec[] = [];
  const black: KeySpec[] = [];
  midis.forEach((midi, index) => {
    white.push({ midi, isBlack: false, whiteIndex: index });
  });
  for (let index = 0; index + 1 < midis.length; index += 1) {
    const left = midis[index] ?? 0;
    const right = midis[index + 1] ?? 0;
    if (right - left === 2) {
      black.push({ midi: left + 1, isBlack: true, whiteIndex: index });
    }
  }
  return {
    white,
    black,
    whiteCount: white.length,
    cIndexes: white.filter((key) => isC(key.midi)).map((key) => key.whiteIndex),
    fIndexes: white.filter((key) => isF(key.midi)).map((key) => key.whiteIndex),
    groups: blackKeyGroups(black),
  };
}

/**
 * 黑键的分组。
 *
 * 真实钢琴上黑键永远是「2 个一组、3 个一组」循环出现的：
 * 相邻黑键差 2 个半音就是同一组，差 3 个半音（A# 到下一个 C#）就换组。
 * 直接从黑键位置推，比写死「每个八度第 1、4 个白键是 C、F」更皮实——
 * 起始音不是 C 时边缘那半组也不会画错。
 */
function blackKeyGroups(black: readonly KeySpec[]): BlackKeyGroup[] {
  const groups: BlackKeyGroup[] = [];
  let current: KeySpec[] = [];
  const flush = () => {
    if (current.length >= 2) {
      const first = current[0]!;
      const last = current[current.length - 1]!;
      groups.push({ fromWhite: first.whiteIndex, toWhite: last.whiteIndex, size: current.length });
    }
    current = [];
  };
  for (const key of black) {
    const previous = current[current.length - 1];
    const sameGroup = previous !== undefined && key.midi - previous.midi === 2 && current.length < 3;
    if (sameGroup) {
      current.push(key);
      continue;
    }
    flush();
    current = [key];
  }
  flush();
  return groups;
}

/** 往下相邻的白键：E→D、F→E、B→C 只差 1 个半音，其余差 2 个。 */
function whiteBelow(midi: number): number {
  const pitchClass = midi % 12;
  return midi - (pitchClass === 0 || pitchClass === 5 ? 1 : 2);
}

/** 往上相邻的白键：E→F、B→C 只差 1 个半音，其余差 2 个。 */
function whiteAbove(midi: number): number {
  const pitchClass = midi % 12;
  return midi + (pitchClass === 11 || pitchClass === 4 ? 1 : 2);
}

/**
 * 以某个音为中心的布局：中心键就是它，向左向右铺开。
 *
 * 为什么不是「从某个 C 开始铺 N 个八度」：
 * 那样 C4 会随八度数落在不同位置（3 个八度时它偏右），学习者一打开
 * 面板还要先找 C4 才知道往哪边数。以 C4 为中心，定位点永远在正中间，
 * 低音在左、高音在右，一眼就对上了。
 *
 * 白键总数 = 八度数 × 7。奇数个八度时中心键正好落在正中；
 * 偶数个八度时中心键落在正中间那条缝的右侧（差半个键宽，看不出来）。
 */
export function centeredKeyboardLayout(centerMidi: number, octaves: number): KeyboardLayout {
  const whiteCount = Math.max(1, octaves * 7);
  const centerIndex = Math.floor(whiteCount / 2);
  const midis: number[] = [];
  let low = centerMidi;
  for (let index = 0; index < centerIndex; index += 1) {
    low = whiteBelow(low);
    midis.unshift(low);
  }
  midis.push(centerMidi);
  let high = centerMidi;
  for (let index = 0; index < whiteCount - centerIndex - 1; index += 1) {
    high = whiteAbove(high);
    midis.push(high);
  }
  return layoutFromWhite(midis);
}

/**
 * 从任意起始八度开始铺 N 个八度（起始音必须是 C）。
 *
 * 保留这个是因为「每个八度重复 C D E F G A B」这条规律本身要能单测，
 * 中心布局在偶数个八度时正好也是 C 对齐的。
 */
export function keyboardLayout(fromMidi: number, octaves: number): KeyboardLayout {
  const midis: number[] = [];
  for (let octave = 0; octave < octaves; octave += 1) {
    const base = fromMidi + octave * 12;
    for (const offset of WHITE_OFFSETS) midis.push(base + offset);
  }
  return layoutFromWhite(midis);
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
