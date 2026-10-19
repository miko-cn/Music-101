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

export function getInterval(a: number, b: number): Interval {
  const raw = Math.abs(b - a);
  const semitones = raw % 12 === 0 && raw > 0 ? 12 : raw % 12;
  return INTERVALS[semitones];
}
