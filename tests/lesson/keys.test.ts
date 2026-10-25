import { describe, expect, it } from "vitest";
import {
  computerKeyAction,
  computerKeyLabel,
  isNoteKey,
  lessonKeyToMidi,
  lessonOctaveKey,
} from "../../src/core/lesson/keys.ts";
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

describe("电脑键的按下与松开", () => {
  it("按下音键 = 起音，松手 = 制音", () => {
    expect(computerKeyAction({ key: "a", octave: 4, down: true })).toEqual({
      kind: "press",
      key: "a",
      midi: noteNameToMidi("C4"),
    });
    expect(computerKeyAction({ key: "a", octave: 4, down: false })).toEqual({
      kind: "release",
      key: "a",
    });
  });

  it("大写键也算同一个键（按住 Shift 弹琴）", () => {
    expect(computerKeyAction({ key: "A", octave: 4, down: true })).toEqual({
      kind: "press",
      key: "a",
      midi: noteNameToMidi("C4"),
    });
  });

  it("长按的自动重复不重新起音", () => {
    // 否则按住不放会变成一个音被反复打断重响。
    expect(computerKeyAction({ key: "a", octave: 4, down: true, repeat: true })).toBeNull();
  });

  it("Z / X 是换八度，不是音键", () => {
    expect(computerKeyAction({ key: "z", octave: 4, down: true })).toEqual({
      kind: "octave",
      octave: 3,
    });
    expect(computerKeyAction({ key: "x", octave: 4, down: true })).toEqual({
      kind: "octave",
      octave: 5,
    });
    // 松开 Z / X 不该去制音——它不是音键。
    expect(computerKeyAction({ key: "z", octave: 4, down: false })).toBeNull();
    expect(isNoteKey("z")).toBe(false);
    expect(isNoteKey("a")).toBe(true);
  });

  it("不相关的键不产生动作", () => {
    expect(computerKeyAction({ key: "q", octave: 4, down: true })).toBeNull();
    expect(computerKeyAction({ key: "q", octave: 4, down: false })).toBeNull();
    expect(computerKeyAction({ key: "Enter", octave: 4, down: true })).toBeNull();
  });

  it("按着音换八度之后松手，仍然认得当初那把键", () => {
    // 松手只看「是不是音键」，不看当前八度——
    // 否则换过八度之后按音高去匹配就找不到那个音，音会一直拖下去。
    const down = computerKeyAction({ key: "a", octave: 4, down: true });
    expect(down?.kind).toBe("press");
    const up = computerKeyAction({ key: "a", octave: 5, down: false });
    expect(up).toEqual({ kind: "release", key: "a" });
  });

  it("八度推到超出音域时，松手依然能制音", () => {
    const down = computerKeyAction({ key: "a", octave: 8, down: true });
    expect(down?.kind).toBe("press");
    const up = computerKeyAction({ key: "a", octave: 0, down: false });
    expect(up).toEqual({ kind: "release", key: "a" });
  });
});
