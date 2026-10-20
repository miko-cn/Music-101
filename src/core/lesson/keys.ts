const NOTE_KEYS = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k"] as const;

/**
 * A–K 从当前八度的 C 起按半音排列：A = C，K = A#。
 * 返回 MIDI 音高；不是这 11 个键时返回 null。
 */
export function lessonKeyToMidi(key: string, octave: number): number | null {
  const index = NOTE_KEYS.indexOf(key.toLowerCase() as (typeof NOTE_KEYS)[number]);
  if (index < 0) return null;
  const midi = (octave + 1) * 12 + index;
  if (midi < 0 || midi > 127) return null;
  return midi;
}

/** Q 低八度，W 回到第 4 八度，E 高八度。别的键返回 null。 */
export function lessonOctaveKey(key: string, octave: number): number | null {
  const name = key.toLowerCase();
  if (name === "q") return Math.max(0, octave - 1);
  if (name === "w") return 4;
  if (name === "e") return Math.min(8, octave + 1);
  return null;
}
