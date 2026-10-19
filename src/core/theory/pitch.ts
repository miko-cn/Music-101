export type PitchClass = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

export const SHARP_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;
export const FLAT_NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"] as const;

const LETTER_INDEX: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export function midiToPitchClass(midi: number): PitchClass {
  return ((((midi % 12) + 12) % 12) as PitchClass);
}

export function pitchClassToName(pitchClass: number, preferFlat = false): string {
  const pc = midiToPitchClass(pitchClass);
  return preferFlat ? FLAT_NAMES[pc] : SHARP_NAMES[pc];
}

export function midiToNoteName(midi: number, preferFlat = false): string {
  const octave = Math.floor(midi / 12) - 1;
  return `${pitchClassToName(midi, preferFlat)}${octave}`;
}

export function noteNameToMidi(noteName: string): number {
  const match = /^([A-Ga-g])([#b]?)(-?\d+)$/.exec(noteName.trim());
  if (!match) throw new Error(`无法解析的音名: ${noteName}`);
  const base = LETTER_INDEX[match[1].toUpperCase()];
  if (base === undefined) throw new Error(`无法解析的音名: ${noteName}`);
  const accidental = match[2] === "#" ? 1 : match[2] === "b" ? -1 : 0;
  const octave = Number(match[3]);
  return (octave + 1) * 12 + (((base + accidental) % 12) + 12) % 12;
}

export function isBlackKey(pitchClass: number): boolean {
  return [1, 3, 6, 8, 10].includes(midiToPitchClass(pitchClass));
}

export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}
