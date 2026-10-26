/**
 * 键盘图的几何。
 *
 * 第 1 关（黑键 2-3 分组）和第 2 关（半音与全音）画的是同一台钢琴，
 * 两张图必须严丝合缝地对上——所以几何只写一份，两边共用。
 *
 * 坐标是 SVG 用户坐标（viewBox 里的数字），不是像素：
 * 图会跟着容器宽度缩放，字号交给 CSS，形状交给这里。
 */
import { midiToNoteName } from "../../core/theory/pitch.ts";
import { toNotationName } from "../../core/theory/notation.ts";

/** 一个白键的宽度。 */
export const WHITE_W = 44;
/** 白键高度。 */
export const WHITE_H = 140;
/** 黑键宽度。 */
export const BLACK_W = 26;
/** 黑键高度（占白键的上半截）。 */
export const BLACK_H = 88;

/** 一个八度内，白键相对 C 的半音数。 */
const WHITE_SEMITONES = [0, 2, 4, 5, 7, 9, 11];

/**
 * 黑键落在第几个白键后面（0 = C 后面）。
 * -1 表示那里没有黑键——E–F 和 B–C 就是全键盘仅有的两个空档，
 * 也就是第 2 关要讲的那两个「天生半音」。
 */
const BLACK_AFTER = [0, 1, -1, 3, 4, 5];

export interface DiagramKey {
  /** 白键序号（0 = C）。 */
  index: number;
  /** 音名，如 "C4"、"C♯4"。 */
  name: string;
  /** MIDI 音高。 */
  midi: number;
  /** 是黑键还是白键。 */
  black: boolean;
  /** 左边界。 */
  x: number;
  width: number;
  /** 中心点（画标注、连箭头用）。 */
  center: number;
}

export interface KeyboardGeometry {
  whites: DiagramKey[];
  blacks: DiagramKey[];
  /** 整段键盘的宽度。 */
  width: number;
}

/**
 * 从 startMidi 开始排一串白键。
 *
 * startMidi 必须是 C（60 / 72 …），黑键的位置由八度结构决定，
 * 不能随便给——否则「二黑键组」「三黑键组」就画错了。
 */
export function keyboardGeometry(startMidi: number, whiteCount: number): KeyboardGeometry {
  const whites: DiagramKey[] = [];
  const blacks: DiagramKey[] = [];
  for (let index = 0; index < whiteCount; index += 1) {
    const octave = Math.floor(index / 7);
    const degree = index % 7;
    const midi = startMidi + octave * 12 + WHITE_SEMITONES[degree]!;
    const x = index * WHITE_W;
    whites.push({
      index,
      name: toNotationName(midiToNoteName(midi)),
      midi,
      black: false,
      x,
      width: WHITE_W,
      center: x + WHITE_W / 2,
    });
    // 黑键必须夹在两个白键中间才有意义——最后一个白键右边没有白键，
    // 就不画它的黑键（否则八度末尾会挂一个孤零零的 C♯）。
    if (BLACK_AFTER[degree]! >= 0 && index + 1 < whiteCount) {
      const blackMidi = midi + 1;
      const blackX = x + WHITE_W - BLACK_W / 2;
      blacks.push({
        index,
        name: toNotationName(midiToNoteName(blackMidi)),
        midi: blackMidi,
        black: true,
        x: blackX,
        width: BLACK_W,
        center: blackX + BLACK_W / 2,
      });
    }
  }
  return { whites, blacks, width: whiteCount * WHITE_W };
}

/**
 * 把黑键按「二个一组 / 三个一组」分组。
 *
 * 返回每组黑键的横向范围——第 1 关要用它画出分组。
 */
export function blackKeyGroups(blacks: readonly DiagramKey[]): { from: number; to: number; size: number }[] {
  const groups: { from: number; to: number; size: number }[] = [];
  let current: DiagramKey[] = [];
  const flush = () => {
    if (current.length === 0) return;
    groups.push({
      from: Math.min(...current.map((key) => key.x)),
      to: Math.max(...current.map((key) => key.x + key.width)),
      size: current.length,
    });
    current = [];
  };
  for (const key of blacks) {
    // 一个八度里黑键的分布是「二个（C♯ D♯）— 三个（F♯ G♯ A♯）」，
    // 所以第 7 个白键（C）和第 3 个白键（F）后面各起一个新组。
    const degree = key.index % 7;
    const inNewGroup = (degree === 0 || degree === 3) && current.length > 0;
    if (inNewGroup) flush();
    current.push(key);
  }
  flush();
  return groups;
}
