import { describe, expect, it } from "vitest";
import {
  isBlackKey,
  midiToFrequency,
  midiToNoteName,
  midiToPitchClass,
  noteNameToMidi,
  pitchClassToName,
} from "../../src/core/theory/pitch.ts";

describe("midiToPitchClass", () => {
  it("把 MIDI 音高映射到 0-11 音级", () => {
    expect(midiToPitchClass(60)).toBe(0);
    expect(midiToPitchClass(61)).toBe(1);
    expect(midiToPitchClass(69)).toBe(9);
    expect(midiToPitchClass(72)).toBe(0);
  });

  it("负音高也正确取模", () => {
    expect(midiToPitchClass(-1)).toBe(11);
    expect(midiToPitchClass(-13)).toBe(11);
  });

  it("非整数音高抛错，避免下游拼出 undefined 音名", () => {
    expect(() => midiToPitchClass(60.5)).toThrow(/整数/);
    expect(() => midiToPitchClass(Number.NaN)).toThrow(/整数/);
  });
});

describe("midiToNoteName", () => {
  it("用科学音高记法，MIDI 60 = C4", () => {
    expect(midiToNoteName(60)).toBe("C4");
    expect(midiToNoteName(69)).toBe("A4");
    expect(midiToNoteName(54)).toBe("F#3");
  });

  it("preferFlat 时用降号拼写", () => {
    expect(midiToNoteName(70, true)).toBe("Bb4");
    expect(midiToNoteName(58, true)).toBe("Bb3");
  });

  it("负八度用 floor 计算，不会截断成 B-1", () => {
    expect(midiToNoteName(0)).toBe("C-1");
    expect(midiToNoteName(-1)).toBe("B-2");
  });
});

describe("noteNameToMidi", () => {
  it("解析升号、降号与负八度", () => {
    expect(noteNameToMidi("C4")).toBe(60);
    expect(noteNameToMidi("A4")).toBe(69);
    expect(noteNameToMidi("F#3")).toBe(54);
    expect(noteNameToMidi("Bb2")).toBe(46);
    expect(noteNameToMidi("C-1")).toBe(0);
  });

  it("变化音不折回同八度：Cb4 = B3，B#3 = C4", () => {
    expect(noteNameToMidi("Cb4")).toBe(59);
    expect(noteNameToMidi("B#3")).toBe(60);
  });

  it("小写字母同样可解析", () => {
    expect(noteNameToMidi("c4")).toBe(60);
    expect(noteNameToMidi("a4")).toBe(69);
  });

  it("非法音名抛错", () => {
    expect(() => noteNameToMidi("H4")).toThrow();
  });

  it("超出 MIDI 0-127 范围的音名抛错", () => {
    expect(() => noteNameToMidi("C999")).toThrow(/0-127/);
    expect(() => noteNameToMidi("C-3")).toThrow(/0-127/);
  });

  it("MIDI 0-127 全域往返一致", () => {
    for (let midi = 0; midi <= 127; midi += 1) {
      expect(noteNameToMidi(midiToNoteName(midi))).toBe(midi);
    }
  });
});

describe("pitchClassToName / isBlackKey", () => {
  it("给出音名与黑键判定", () => {
    expect(pitchClassToName(0)).toBe("C");
    expect(pitchClassToName(6)).toBe("F#");
    expect(pitchClassToName(6, true)).toBe("Gb");
    expect(isBlackKey(1)).toBe(true);
    expect(isBlackKey(6)).toBe(true);
    expect(isBlackKey(0)).toBe(false);
    expect(isBlackKey(9)).toBe(false);
  });
});

describe("midiToFrequency", () => {
  it("A4 = 440Hz，每八度翻倍", () => {
    expect(midiToFrequency(69)).toBeCloseTo(440, 6);
    expect(midiToFrequency(57)).toBeCloseTo(220, 6);
    expect(midiToFrequency(81)).toBeCloseTo(880, 6);
  });
});
