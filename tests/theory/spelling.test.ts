import { describe, expect, it } from "vitest";
import { spellChordTones } from "../../src/core/theory/chord.ts";
import { noteNameToMidi } from "../../src/core/theory/pitch.ts";
import { spellScaleNotes } from "../../src/core/theory/scale.ts";

describe("spellChordTones", () => {
  it("F# 大七的七音是 E#，不是 F", () => {
    expect(spellChordTones({ root: 6, quality: "maj7" })).toEqual(["F#", "A#", "C#", "E#"]);
  });

  it("降号记谱下同一个音级写成 Gb 大七：Gb Bb Db F", () => {
    expect(spellChordTones({ root: 6, quality: "maj7" }, true)).toEqual(["Gb", "Bb", "Db", "F"]);
  });

  it("C# 大七按三度叠字母：C# E# G# B#", () => {
    expect(spellChordTones({ root: 1, quality: "maj7" })).toEqual(["C#", "E#", "G#", "B#"]);
  });

  it("属七的七音按小七度记降号，不改成升六度", () => {
    expect(spellChordTones({ root: 0, quality: "dom7" })).toEqual(["C", "E", "G", "Bb"]);
  });

  it("Gb 小三的三音是 Bbb", () => {
    expect(spellChordTones({ root: 6, quality: "min" }, true)).toEqual(["Gb", "Bbb", "Db"]);
  });

  it("减七的七音是重降，不记成大六度", () => {
    expect(spellChordTones({ root: 0, quality: "dim7" })).toEqual(["C", "Eb", "Gb", "Bbb"]);
  });

  it("挂留和加九保持该有的字母，不加错成三度", () => {
    expect(spellChordTones({ root: 6, quality: "sus4" })).toEqual(["F#", "B", "C#"]);
    expect(spellChordTones({ root: 6, quality: "add9" })).toEqual(["F#", "A#", "C#", "G#"]);
    expect(spellChordTones({ root: 0, quality: "sus2" })).toEqual(["C", "D", "G"]);
  });
});

describe("spellScaleNotes", () => {
  it("F# 大调的导音是 E#", () => {
    expect(spellScaleNotes(6, "major")).toEqual(["F#", "G#", "A#", "B", "C#", "D#", "E#"]);
  });

  it("F# 自然小调的七级是 E，和声小调的七级是 E#", () => {
    expect(spellScaleNotes(6, "naturalMinor")).toEqual(["F#", "G#", "A", "B", "C#", "D", "E"]);
    expect(spellScaleNotes(6, "harmonicMinor")).toEqual(["F#", "G#", "A", "B", "C#", "D", "E#"]);
  });

  it("C# 大调含 E# 与 B#", () => {
    expect(spellScaleNotes(1, "major")).toEqual(["C#", "D#", "E#", "F#", "G#", "A#", "B#"]);
  });

  it("Gb 大调含 Cb，不把七级写成 E#", () => {
    expect(spellScaleNotes(6, "major", true)).toEqual(["Gb", "Ab", "Bb", "Cb", "Db", "Eb", "F"]);
  });
});

describe("异名音名可以解析回 MIDI", () => {
  it("E#4 与 F4 是同一个音，B#3 与 C4 是同一个音", () => {
    expect(noteNameToMidi("E#4")).toBe(65);
    expect(noteNameToMidi("F4")).toBe(65);
    expect(noteNameToMidi("B#3")).toBe(60);
  });

  it("重升与重降", () => {
    expect(noteNameToMidi("Fx4")).toBe(67);
    expect(noteNameToMidi("F##4")).toBe(67);
    expect(noteNameToMidi("Bbb4")).toBe(69);
  });
});
