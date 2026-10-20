import { describe, expect, it } from "vitest";
import { computerKeyLabel, lessonKeyToMidi, lessonOctaveKey } from "../../src/core/lesson/keys.ts";
import { noteNameToMidi } from "../../src/core/theory/pitch.ts";

describe("钢琴式电脑键", () => {
  it("白键 A S D F G H J 是 C D E F G A B", () => {
    expect(lessonKeyToMidi("a", 4)).toBe(noteNameToMidi("C4"));
    expect(lessonKeyToMidi("A", 4)).toBe(60);
    expect(lessonKeyToMidi("s", 4)).toBe(noteNameToMidi("D4"));
    expect(lessonKeyToMidi("d", 4)).toBe(noteNameToMidi("E4"));
    expect(lessonKeyToMidi("f", 4)).toBe(noteNameToMidi("F4"));
    expect(lessonKeyToMidi("g", 4)).toBe(noteNameToMidi("G4"));
    expect(lessonKeyToMidi("h", 4)).toBe(noteNameToMidi("A4"));
    expect(lessonKeyToMidi("j", 4)).toBe(noteNameToMidi("B4"));
  });

  it("黑键 W E T Y U 是 C# D# F# G# A#，跳过 E–F 和 B–C", () => {
    expect(lessonKeyToMidi("w", 4)).toBe(noteNameToMidi("C#4"));
    expect(lessonKeyToMidi("e", 4)).toBe(noteNameToMidi("D#4"));
    expect(lessonKeyToMidi("t", 4)).toBe(noteNameToMidi("F#4"));
    expect(lessonKeyToMidi("y", 4)).toBe(noteNameToMidi("G#4"));
    expect(lessonKeyToMidi("u", 4)).toBe(noteNameToMidi("A#4"));
    expect(lessonKeyToMidi("k", 4)).toBeNull();
  });

  it("琴键上的键帽和音高对得上", () => {
    expect(computerKeyLabel(0)).toBe("A");
    expect(computerKeyLabel(2)).toBe("S");
    expect(computerKeyLabel(11)).toBe("J");
    expect(computerKeyLabel(1)).toBe("W");
    expect(computerKeyLabel(6)).toBe("T");
    expect(computerKeyLabel(10)).toBe("U");
  });

  it("Z 降低八度，X 升高八度，W 和 E 不再换八度", () => {
    expect(lessonOctaveKey("z", 4)).toBe(3);
    expect(lessonOctaveKey("x", 4)).toBe(5);
    expect(lessonOctaveKey("z", 0)).toBe(0);
    expect(lessonOctaveKey("x", 8)).toBe(8);
    expect(lessonOctaveKey("w", 4)).toBeNull();
    expect(lessonOctaveKey("e", 4)).toBeNull();
    expect(lessonOctaveKey("q", 4)).toBeNull();
  });
});
