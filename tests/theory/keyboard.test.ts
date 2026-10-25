import { describe, expect, it } from "vitest";
import { keyboardLayout, quizHighlight } from "../../src/core/theory/keyboard.ts";
import { midiToNoteName } from "../../src/core/theory/pitch.ts";

const BLACK_NAMES = ["C#", "D#", "F#", "G#", "A#"];
const WHITE_NAMES = ["C", "D", "E", "F", "G", "A", "B"];

describe("键盘布局", () => {
  it("每个八度 7 个白键、5 个黑键", () => {
    const { white, black } = keyboardLayout(36, 3);
    expect(white).toHaveLength(21);
    expect(black).toHaveLength(15);
  });

  it("黑键的音名是 C# D# F# G# A#，不是白键音高", () => {
    const { black } = keyboardLayout(36, 1);
    expect(black.map((key) => midiToNoteName(key.midi))).toEqual([
      "C#2",
      "D#2",
      "F#2",
      "G#2",
      "A#2",
    ]);
  });

  it("三个八度的黑键音名逐八度重复", () => {
    const { black } = keyboardLayout(36, 3);
    const names = black.map((key) => midiToNoteName(key.midi).replace(/\d+$/, ""));
    expect(names).toEqual([...BLACK_NAMES, ...BLACK_NAMES, ...BLACK_NAMES]);
  });

  it("白键音名逐八度重复 C D E F G A B", () => {
    const { white } = keyboardLayout(36, 3);
    const names = white.map((key) => midiToNoteName(key.midi).replace(/\d+$/, ""));
    expect(names).toEqual([...WHITE_NAMES, ...WHITE_NAMES, ...WHITE_NAMES]);
  });

  it("黑键夹在正确的两个白键之间：C# 在 C 和 D 之间，F# 在 F 和 G 之间", () => {
    const { white, black } = keyboardLayout(36, 1);
    const whiteAt = (index: number) => white[index]?.midi ?? -1;
    for (const key of black) {
      const left = whiteAt(key.whiteIndex);
      const right = whiteAt(key.whiteIndex + 1);
      expect(right).toBeGreaterThan(left);
      // 黑键的音高严格夹在左右白键之间
      expect(key.midi).toBeGreaterThan(left);
      expect(key.midi).toBeLessThan(right);
    }
    const byName = (name: string) => black.find((key) => midiToNoteName(key.midi) === name);
    expect(byName("C#2")?.whiteIndex).toBe(0);
    expect(byName("D#2")?.whiteIndex).toBe(1);
    expect(byName("F#2")?.whiteIndex).toBe(3);
    expect(byName("G#2")?.whiteIndex).toBe(4);
    expect(byName("A#2")?.whiteIndex).toBe(5);
  });

  it("定位点：C 是每八度第 1 个白键，F 是第 4 个白键", () => {
    const { white } = keyboardLayout(36, 3);
    const cIndexes = white.filter((key) => key.midi % 12 === 0).map((key) => key.whiteIndex);
    const fIndexes = white.filter((key) => key.midi % 12 === 5).map((key) => key.whiteIndex);
    expect(cIndexes).toEqual([0, 7, 14]);
    expect(fIndexes).toEqual([3, 10, 17]);
  });

  it("中央 C 是 MIDI 60，编号从它往两边走", () => {
    const { white } = keyboardLayout(48, 2);
    const names = white.map((key) => midiToNoteName(key.midi));
    expect(names[0]).toBe("C3");
    expect(names[7]).toBe("C4");
    expect(white.find((key) => midiToNoteName(key.midi) === "C4")?.midi).toBe(60);
  });

  it("从任意起始八度开始，布局都成立", () => {
    const { white, black } = keyboardLayout(48, 2);
    expect(white).toHaveLength(14);
    expect(black).toHaveLength(10);
    expect(black.map((key) => midiToNoteName(key.midi).replace(/\d+$/, ""))).toEqual([
      ...BLACK_NAMES,
      ...BLACK_NAMES,
    ]);
  });
});

describe("测验高亮", () => {
  it("没作答时一个键都不高亮——高亮等于泄题", () => {
    const { pitchClasses, exact } = quizHighlight({ midi: 55, answered: false });
    expect(pitchClasses.size).toBe(0);
    expect(exact.size).toBe(0);
  });

  it("没有测验时也不高亮", () => {
    const { pitchClasses, exact } = quizHighlight(null);
    expect(pitchClasses.size).toBe(0);
    expect(exact.size).toBe(0);
  });

  it("作答后标出正确的那一个键", () => {
    const { exact } = quizHighlight({ midi: 55, answered: true });
    expect(exact.has(55)).toBe(true);
    expect(exact.size).toBe(1);
  });

  it("作答后同时标出同名音的整个音类", () => {
    const { pitchClasses } = quizHighlight({ midi: 55, answered: true });
    expect(pitchClasses.has(55 % 12)).toBe(true);
    expect(pitchClasses.size).toBe(1);
  });

  it("同一个音类里答对答错，高亮到的都是那个音高", () => {
    for (const midi of [36, 43, 55, 67, 84]) {
      const { exact, pitchClasses } = quizHighlight({ midi, answered: true });
      expect(exact.has(midi)).toBe(true);
      expect(pitchClasses.has(midi % 12)).toBe(true);
    }
  });
});
