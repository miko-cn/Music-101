/**
 * 反馈音效。
 *
 * 这些提示音不用「叮」「嘟」这种通用音效，而是用音乐语汇：
 *
 * - 对了：在当前调的音阶上弹一个短促上行音程（调内三度），连对时一路往上爬。
 * - 不对：低八度、闷掉的下行二度。
 * - 过关：调内主三和弦的琶音，最后一个音是八度。
 * - 选中：调内第 5 级的一个轻音。
 * - 里程碑：调内主三和弦同时响。
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

/** 反馈音。 */
export type SfxCue = "correct" | "wrong" | "pass" | "select" | "milestone";

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
  /** 相对音量，缺省 1。select 这种只是「点到了」的提示要很轻。 */
  gain?: number;
}

export interface SfxOptions {
  /** 调的根音。缺省按 C。 */
  keyRoot?: PitchClass;
  /** 调的音阶。缺省按大调。 */
  keyScale?: ScaleId;
  /** 连对第几题，从 1 开始。缺省 = 1。只影响 correct。 */
  streak?: number;
}

/** 连对最多爬到第 5 级：再往上就出了舒服的音区。 */
const STREAK_TOP_DEGREE = 4;

/** milestone 整体延后的秒数：跟 correct 同时调用，要排在上行三度之后。 */
export const MILESTONE_DELAY = 0.28;

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
 * 每条音效的形状都跟语义同构，这是刻意的：
 * 上行 = 对了，下行 = 不对，琶音展开 = 过关，
 * 一个轻音 = 点到了，和弦同时落定 = 里程碑。
 */
export function sfxSteps(cue: SfxCue, options: SfxOptions = {}): SfxStep[] {
  const root = options.keyRoot ?? DEFAULT_ROOT;
  const scale = options.keyScale ?? DEFAULT_SCALE;
  const intervals = SCALE_INTERVALS[scale];
  const base = pitchAt(BASE_OCTAVE, root);

  if (cue === "correct") {
    // 连对时上行三度一路往音阶上爬：第 1 题从主音起，第 5 题从第 5 级起。
    // 起点和终点都取调内音，所以每一档都是调内三度（大三或小三，按调定）。
    const degree = Math.min(Math.max((options.streak ?? 1) - 1, 0), STREAK_TOP_DEGREE);
    const from = base + (intervals[degree] ?? 0);
    const to = base + (intervals[degree + 2] ?? 4);
    return [
      { voice: "pluck", midi: from, offset: 0, duration: 0.16 },
      { voice: "pluck", midi: to, offset: 0.09, duration: 0.24 },
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

  if (cue === "select") {
    // 选中一个没有声音的选项：很轻的一下，告诉你「点到了」，不抢判定音的戏。
    return [{ voice: "pure", midi: base + (intervals[4] ?? 7), offset: 0, duration: 0.06, gain: 0.35 }];
  }

  if (cue === "milestone") {
    // 连对里程碑：主三和弦同时响，像一声和弦落定。
    // 放在高八度：连对第 5 题的答对音停在第 7 级（大调是导音），
    // 根音在上方才是往上解决到主音；放在 base 就成了往下跳七度，落不住。
    const third = intervals[2] ?? 4;
    const fifth = intervals[4] ?? 7;
    return [0, third, fifth].map((interval) => ({
      voice: "pluck" as const,
      midi: base + 12 + interval,
      offset: MILESTONE_DELAY,
      duration: 0.5,
    }));
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
