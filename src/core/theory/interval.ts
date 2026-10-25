export interface Interval {
  semitones: number;
  name: string;
  shortName: string;
  consonance: number;
}

export const INTERVALS: readonly Interval[] = [
  { semitones: 0, name: "纯一度", shortName: "P1", consonance: 5 },
  { semitones: 1, name: "小二度", shortName: "m2", consonance: 1 },
  { semitones: 2, name: "大二度", shortName: "M2", consonance: 2 },
  { semitones: 3, name: "小三度", shortName: "m3", consonance: 4 },
  { semitones: 4, name: "大三度", shortName: "M3", consonance: 5 },
  { semitones: 5, name: "纯四度", shortName: "P4", consonance: 4 },
  { semitones: 6, name: "三全音", shortName: "TT", consonance: 1 },
  { semitones: 7, name: "纯五度", shortName: "P5", consonance: 6 },
  { semitones: 8, name: "小六度", shortName: "m6", consonance: 3 },
  { semitones: 9, name: "大六度", shortName: "M6", consonance: 4 },
  { semitones: 10, name: "小七度", shortName: "m7", consonance: 3 },
  { semitones: 11, name: "大七度", shortName: "M7", consonance: 3 },
  { semitones: 12, name: "纯八度", shortName: "P8", consonance: 5 },
];

/**
 * 计算两个 MIDI 音高之间的音程（不区分方向）。
 *
 * 复合音程（超过纯八度）会被折叠为其等效的简单音程，例如 60→84 记作 P8；
 * 只有同音（a === b）才记作纯一度 P1。
 */
export function getInterval(a: number, b: number): Interval {
  const raw = Math.abs(b - a);
  // 非整数音距在音程表里没有对应项，会静默返回 undefined，先行拒绝。
  if (!Number.isInteger(raw)) throw new Error(`非法音程: ${a} → ${b}`);
  // 整八度要折成 12 而不是 0：纯一度（同音）与纯八度语义不同，0 只留给同音。
  const semitones = raw % 12 === 0 && raw > 0 ? 12 : raw % 12;
  // 显式标注 `Interval | undefined` 让判空成为编译器可见的真检查。
  const found: Interval | undefined = INTERVALS[semitones];
  if (found === undefined) throw new Error(`非法音程: ${a} → ${b}`);
  return found;
}
