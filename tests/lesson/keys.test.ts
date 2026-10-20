import { describe, expect, it } from "vitest";
import { lessonKeyToMidi, lessonOctaveKey } from "../../src/core/lesson/keys.ts";
import { noteNameToMidi } from "../../src/core/theory/pitch.ts";

describe("第 1 关键盘映射", () => {
  it("第 4 八度时 A 是 C4，K 是 A#4", () => {
    expect(lessonKeyToMidi("a", 4)).toBe(noteNameToMidi("C4"));
    expect(lessonKeyToMidi("A", 4)).toBe(60);
    expect(lessonKeyToMidi("k", 4)).toBe(noteNameToMidi("A#4"));
    expect(lessonKeyToMidi("z", 4)).toBeNull();
  });

  it("Q 降低八度，W 回到 4，E 升高八度", () => {
    expect(lessonOctaveKey("q", 4)).toBe(3);
    expect(lessonOctaveKey("w", 2)).toBe(4);
    expect(lessonOctaveKey("e", 4)).toBe(5);
    expect(lessonOctaveKey("q", 0)).toBe(0);
  });
});
