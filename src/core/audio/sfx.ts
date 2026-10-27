/**
 * 反馈音效。
 *
 * 这三种提示音不用「叮」「嘟」这种通用音效，而是用音乐语汇：
 *
 * - 对了：在当前调的音阶上弹一个短促上行音程（调内三度）。
 * - 不对：低八度、闷掉的下行二度。
 * - 过关：调内主三和弦的琶音，最后一个音是八度。
 *
 * 为什么值得这么做：这是学音乐的产品。用户答错时听到的是一个
 * 「下行二度」，而不是一声电子蜂鸣——那声音本身就在说「往下走」，
 * 不用文字解释。反过来，答对时的上行音程跟「对了」的意思是同构的。
 *
 * 全部是纯函数，不碰 AudioContext：音高和时序在这里定，
 * engine.ts 只负责把它们播出来。这样单测能直接断言音高关系。
 */
import { SCALE_INTERVALS, type ScaleId } from "../theory/scale.ts";
import type { PitchClass } from "../theory/pitch.ts";

/** 三种反馈。 */
export type SfxCue = "correct" | "wrong" | "pass";

/** 音效里用到的音色。只有三种，够用了。 */
export type SfxVoice = "pluck" | "bass" | "pure";

export interface SfxStep {
  voice: SfxVoice;
  /** MIDI 音高。 */
  midi: number;
  /** 相对开始的秒数。 */
  offset: number;
  /** 按住多久（秒）。 */
  duration: number;
}

export interface SfxOptions {
  /** 调的根音。缺省按 C。 */
  keyRoot?: PitchClass;
  /** 调的音阶。缺省按大调。 */
  keyScale?: ScaleId;
}

/** 默认根音：C。 */
const DEFAULT_ROOT: PitchClass = 0;
/** 默认音阶：大调。 */
const DEFAULT_SCALE: ScaleId = "major";

/** 音效的基准八度。对答反馈用 C5 附近，够亮也不刺耳。 */
const BASE_OCTAVE = 5;
/** 「不对」用的低八度基准。 */
const LOW_OCTAVE = 3;

/** MIDI 音高 = 八度基准 + 根音音级。 */
function pitchAt(octave: number, root: PitchClass): number {
  return (octave + 1) * 12 + root;
}

/**
 * 排出一条反馈音效。
 *
 * 三条音效的形状都跟语义同构，这是刻意的：
 * 上行 = 对了，下行 = 不对，琶音展开 = 过关。
 */
export function sfxSteps(cue: SfxCue, options: SfxOptions = {}): SfxStep[] {
  const root = options.keyRoot ?? DEFAULT_ROOT;
  const scale = options.keyScale ?? DEFAULT_SCALE;
  const intervals = SCALE_INTERVALS[scale];
  const base = pitchAt(BASE_OCTAVE, root);

  if (cue === "correct") {
    // 调内三度，上行。短促、明亮：pluck 是个带包络的拨弦音色。
    const third = intervals[2] ?? 4;
    return [
      { voice: "pluck", midi: base, offset: 0, duration: 0.16 },
      { voice: "pluck", midi: base + third, offset: 0.09, duration: 0.24 },
    ];
  }

  if (cue === "wrong") {
    // 低八度、往下走二度。bass 音色本身就是低通的，听着就闷。
    const low = pitchAt(LOW_OCTAVE, root);
    return [
      { voice: "bass", midi: low, offset: 0, duration: 0.18 },
      { voice: "bass", midi: low - 2, offset: 0.1, duration: 0.26 },
    ];
  }

  // 过关：调内三和弦琶音，最后落在八度上——「这件事完成了」。
  const third = intervals[2] ?? 4;
  const fifth = intervals[4] ?? 7;
  return [
    { voice: "pluck", midi: base, offset: 0, duration: 0.14 },
    { voice: "pluck", midi: base + third, offset: 0.08, duration: 0.14 },
    { voice: "pluck", midi: base + fifth, offset: 0.16, duration: 0.14 },
    { voice: "pluck", midi: base + 12, offset: 0.24, duration: 0.42 },
  ];
}
