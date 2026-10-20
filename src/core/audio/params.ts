/** 第 1 关用的合成积木参数。这里没有 AudioContext，单测只检查数字。 */

export interface KickVoice {
  /** 规格：正弦音高包络 60Hz → 40Hz。 */
  startHz: number;
  endHz: number;
  pitchSeconds: number;
  clickSeconds: number;
  duration: number;
}

export interface SubVoice {
  startHz: number;
  endHz: number;
  pitchSeconds: number;
  duration: number;
  drive: number;
}

export interface ToneVoice {
  duration: number;
  /** 低通截止频率，bass / supersaw 用。 */
  lowpassHz: number;
  drive: number;
}

export const SUPERSAW_CENTS = [-18, -12, -6, 0, 6, 12, 18] as const;

export function kickVoice(): KickVoice {
  return { startHz: 60, endHz: 40, pitchSeconds: 0.09, clickSeconds: 0.012, duration: 0.22 };
}

export function subVoice(): SubVoice {
  return { startHz: 70, endHz: 40, pitchSeconds: 0.35, duration: 0.7, drive: 2.4 };
}

export function bassVoice(): ToneVoice {
  return { duration: 0.35, lowpassHz: 420, drive: 2 };
}

export function supersawVoice(): ToneVoice {
  return { duration: 0.45, lowpassHz: 1800, drive: 1.2 };
}

export function pluckVoice(): ToneVoice {
  return { duration: 0.28, lowpassHz: 2400, drive: 1 };
}

/** 饱和曲线：x 从 -1 到 1，tanh 压到 (-1, 1)。 */
export function saturationCurve(samples = 257, drive = 2): Float32Array {
  if (!Number.isInteger(samples) || samples < 3) throw new Error(`曲线点数至少 3: ${samples}`);
  const curve = new Float32Array(samples);
  for (let index = 0; index < samples; index += 1) {
    const x = (index / (samples - 1)) * 2 - 1;
    curve[index] = Math.tanh(drive * x);
  }
  return curve;
}

export interface GainPoint {
  /** 相对这一拍起点的秒。 */
  time: number;
  gain: number;
}

/**
 * 真侧链用的增益点：每个触发格立刻压到 duck，再在 recoverSeconds 内回到 1。
 * 时间是相对 pattern 起点的秒，不碰 AudioParam。
 */
export function sidechainAutomation(
  triggers: readonly number[],
  stepSeconds: number,
  duck = 0.2,
  recoverSeconds = 0.16,
): GainPoint[] {
  const points: GainPoint[] = [{ time: 0, gain: 1 }];
  const ordered = [...triggers].filter((step) => step >= 0).sort((a, b) => a - b);
  for (const step of ordered) {
    const at = step * stepSeconds;
    points.push({ time: at, gain: duck });
    points.push({ time: at + recoverSeconds, gain: 1 });
  }
  return points;
}
