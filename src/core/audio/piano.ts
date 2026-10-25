/**
 * 钢琴 / 电钢音色的物理模型。
 *
 * 这里只有纯数据和纯函数，不碰 Web Audio：音高位置、泛音结构、衰减顺序一旦算错，
 * 学习者听到的就是错的音色，而错的音色会被当成「正确的音」记住。
 */

import { midiToFrequency } from "../theory/pitch.ts";

/** 一个泛音的描述。 */
export interface PartialSpec {
  /** 相对基频的倍数：1 = 基音，2 = 八度泛音，3 = 十二度泛音。 */
  ratio: number;
  /** 相对增益。 */
  gain: number;
  /** 衰减时间相对基音的倍率：越小消音越快。 */
  decayRatio: number;
  /** 起音时间（秒）。 */
  attack: number;
}

export interface ToneProfile {
  /** 音色名，用于调试和关卡文案。 */
  name: string;
  partials: readonly PartialSpec[];
  /** 基音在中央 C（MIDI 60）处的衰减时间常数（秒）。 */
  baseDecaySeconds: number;
  /** 音区越高衰减越快的指数。 */
  decayTilt: number;
  /** 衰减时间常数的上下限（秒）。 */
  minDecaySeconds: number;
  maxDecaySeconds: number;
  /** 槌击 / 音叉噪声。 */
  clickSeconds: number;
  clickGain: number;
  clickHz: number;
  /** 音叉（弦）的不谐和系数：泛音会被拉得比理论值略高。 */
  inharmonicityLow: number;
  inharmonicityHigh: number;
  /** 整体音量。 */
  peak: number;
  /** 松键后制音器落下的时间常数（秒）。 */
  releaseSeconds: number;
}

/**
 * 电钢（Rhodes）的加法近似。
 *
 * 电钢的辨识度来自「音叉的亮起音」：敲下去一瞬间有个亮、带金属感的音，
 * 很快暗下去，剩下一个温暖的基音。所以第二个泛音（八度）增益大但消音极快，
 * 后面几个更小更快——高次泛音先死，声音自然变暗，这是钢琴和电钢共同的特征，
 * 也是「加了泛音之后声音会越听越闷」这件事的物理原因。
 */
export const RHODES: ToneProfile = {
  name: "电钢 Rhodes",
  partials: [
    { ratio: 1, gain: 1, decayRatio: 1, attack: 0.005 },
    { ratio: 2, gain: 0.3, decayRatio: 0.16, attack: 0.002 },
    { ratio: 3, gain: 0.08, decayRatio: 0.1, attack: 0.001 },
    { ratio: 4, gain: 0.03, decayRatio: 0.07, attack: 0.001 },
  ],
  baseDecaySeconds: 1.6,
  decayTilt: 0.55,
  minDecaySeconds: 0.25,
  maxDecaySeconds: 2.8,
  clickSeconds: 0.014,
  clickGain: 0.09,
  clickHz: 2600,
  inharmonicityLow: 0.0002,
  inharmonicityHigh: 0.0009,
  peak: 0.3,
  releaseSeconds: 0.08,
};

/**
 * 听辨题用的纯音。
 *
 * 听辨要回答的是「这是不是大二度」「这是不是大三和弦」，答案只跟音高有关，
 * 音色必须剥掉，否则泛音会干扰判断。八度泛音留一点点纯粹是为了不刺耳——
 * 它是基频的两倍，不改变音高感知。
 */
export interface PlainToneProfile {
  /** 八度泛音相对主音的增益。 */
  octaveGain: number;
  attackSeconds: number;
  releaseSeconds: number;
  peak: number;
}

export const PLAIN_TONE: PlainToneProfile = {
  octaveGain: 0.08,
  attackSeconds: 0.012,
  releaseSeconds: 0.05,
  peak: 0.3,
};

/** 点琴键时按住多久（秒）：够听完起音和一段自然衰减，又不会盖住下一次点击。 */
export const PIANO_HOLD_SECONDS = 1.6;

/** 中央 C 的频率，作为音区衰减的参考点。 */
const CENTRAL_C_HZ = 261.6255653;

/** A0 = 21，C8 = 108。 */
const LOWEST_MIDI = 21;
const HIGHEST_MIDI = 108;

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/**
 * 某个音区的弦有多「不谐和」。
 *
 * 真实的弦因为有刚性，泛音会被拉得比理想值高一点；弦越短越粗（高音区）拉得越开。
 * 数值很小，但少了它，高次泛音会听起来像被调准过的合成器，缺少「真乐器」的味道。
 */
export function inharmonicityAt(midi: number, profile: ToneProfile): number {
  const t = clamp((midi - LOWEST_MIDI) / (HIGHEST_MIDI - LOWEST_MIDI), 0, 1);
  return (
    profile.inharmonicityLow + (profile.inharmonicityHigh - profile.inharmonicityLow) * t * t
  );
}

/**
 * 每个泛音的实际频率（Hz）。
 *
 * 理想弦的第 n 个泛音正好是 n 倍基频；真实弦因为刚性会偏高：
 * f_n = n · f · √(1 + B·n²)。
 *
 * 基音本身不拉伸——基音就是它该有的音高，拉伸只用来给高次泛音染色。
 * 差值虽然只有 0.3 音分（听不出来），但学习者的耳朵是拿来当基准的，
 * 基准不能飘。
 */
export function partialFrequencies(midi: number, profile: ToneProfile): number[] {
  const fundamental = midiToFrequency(midi);
  const b = inharmonicityAt(midi, profile);
  return profile.partials.map((partial) => {
    const n = partial.ratio;
    if (n === 1) return fundamental;
    return fundamental * n * Math.sqrt(1 + b * n * n);
  });
}

/**
 * 基音的衰减时间常数（秒）。
 *
 * 音区越高，同样长度的弦能量越小、衰减越快，所以用频率的负次幂来缩放。
 */
export function fundamentalDecaySeconds(midi: number, profile: ToneProfile): number {
  const frequency = midiToFrequency(midi);
  const tau =
    profile.baseDecaySeconds * Math.pow(CENTRAL_C_HZ / frequency, profile.decayTilt);
  return clamp(tau, profile.minDecaySeconds, profile.maxDecaySeconds);
}

/** 每个泛音的衰减时间常数（秒）：高次泛音消音更快。 */
export function partialDecays(midi: number, profile: ToneProfile): number[] {
  const base = fundamentalDecaySeconds(midi, profile);
  return profile.partials.map((partial) => Math.max(base * partial.decayRatio, 0.04));
}

/**
 * 一个音自然响到听不见要多久（秒）。
 *
 * 指数衰减到 -60dB 大约需要 6.9 个时间常数；再留一点余量给制音器落下。
 */
export function noteLifeSeconds(midi: number, profile: ToneProfile): number {
  return fundamentalDecaySeconds(midi, profile) * 6.9 + profile.releaseSeconds;
}
