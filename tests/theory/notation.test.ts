import { describe, expect, it } from "vitest";
import {
  DOUBLE_FLAT_SIGN,
  DOUBLE_SHARP_SIGN,
  FLAT_SIGN,
  SHARP_SIGN,
  splitNoteName,
  toNotationName,
} from "../../src/core/theory/notation.ts";
import { midiToNoteName, noteNameToMidi } from "../../src/core/theory/pitch.ts";

describe("记谱显示", () => {
  it("记谱符号的码位是对的", () => {
    // 这一条是专门防转义写错的：JS 里 "\u1D12A" 会被解析成 "\u1D12" + 字母 "A"，
    // 表面看没问题，渲染出来却是两个字符。码位断言比"跟常量比"死得可靠。
    expect(SHARP_SIGN.codePointAt(0)).toBe(0x266f);
    expect(FLAT_SIGN.codePointAt(0)).toBe(0x266d);
    expect(DOUBLE_SHARP_SIGN.codePointAt(0)).toBe(0x1d12a);
    expect(DOUBLE_FLAT_SIGN.codePointAt(0)).toBe(0x1d12b);
    // 星平面字符在 JS 里是两个 UTF-16 码元
    expect(DOUBLE_SHARP_SIGN).toHaveLength(2);
    expect(DOUBLE_FLAT_SIGN).toHaveLength(2);
    expect(SHARP_SIGN).toHaveLength(1);
  });

  it("升号和降号换成谱面符号", () => {
    expect(toNotationName("C#4")).toBe(`C${SHARP_SIGN}4`);
    expect(toNotationName("Bb2")).toBe(`B${FLAT_SIGN}2`);
    expect(toNotationName("F#3")).toBe(`F${SHARP_SIGN}3`);
  });

  it("重升和重降合并成一个记谱符号", () => {
    expect(toNotationName("F##3")).toBe(`F${DOUBLE_SHARP_SIGN}3`);
    expect(toNotationName("Cbb4")).toBe(`C${DOUBLE_FLAT_SIGN}4`);
    // x 是重升的另一种 ASCII 写法
    expect(toNotationName("Fx3")).toBe(`F${DOUBLE_SHARP_SIGN}3`);
  });

  it("自然音名原样保留", () => {
    expect(toNotationName("C4")).toBe("C4");
    expect(toNotationName("G")).toBe("G");
    expect(toNotationName("A0")).toBe("A0");
  });

  it("负八度照常显示", () => {
    expect(toNotationName("C-1")).toBe("C-1");
  });

  it("拆成字母、变音记号、八度三段", () => {
    expect(splitNoteName("C#4")).toEqual({ letter: "C", accidental: SHARP_SIGN, octave: "4" });
    expect(splitNoteName("Eb2")).toEqual({ letter: "E", accidental: FLAT_SIGN, octave: "2" });
    expect(splitNoteName("C")).toEqual({ letter: "C", accidental: "", octave: "" });
  });

  it("不是音名的字符串原样返回，不抛错", () => {
    expect(splitNoteName("和弦")).toEqual({ letter: "和弦", accidental: "", octave: "" });
    expect(toNotationName("Cmaj7")).toBe("Cmaj7");
  });

  it("已经是记谱写法的输入也认得", () => {
    expect(toNotationName(`C${SHARP_SIGN}4`)).toBe(`C${SHARP_SIGN}4`);
  });
});

describe("记谱写法能解析回音高", () => {
  it("显示成谱面符号之后还能读回来", () => {
    for (const midi of [0, 12, 60, 61, 70, 71, 108, 127]) {
      const ascii = midiToNoteName(midi);
      const notation = toNotationName(ascii);
      expect(noteNameToMidi(notation)).toBe(midi);
    }
  });

  it("重升重降也读得回来", () => {
    // F𝄪3 = G3 = 55（不是 F#3 的 54——重升是两个半音）
    expect(noteNameToMidi(`F${DOUBLE_SHARP_SIGN}3`)).toBe(55);
    // C𝄫4 = B♭3 = 58
    expect(noteNameToMidi(`C${DOUBLE_FLAT_SIGN}4`)).toBe(58);
  });
});
