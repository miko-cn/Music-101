import { describe, expect, it } from "vitest";
import {
  getChordPitches,
  matchChord,
  romanNumeral,
} from "../../src/core/theory/chord.ts";

describe("getChordPitches", () => {
  it("大三和弦与小三和弦", () => {
    expect(getChordPitches({ root: 9, quality: "maj" })).toEqual([9, 1, 4]);
    expect(getChordPitches({ root: 9, quality: "min" })).toEqual([9, 0, 4]);
  });

  it("色彩和弦", () => {
    expect(getChordPitches({ root: 9, quality: "maj7" })).toEqual([9, 1, 4, 8]);
    expect(getChordPitches({ root: 9, quality: "add9" })).toEqual([9, 1, 4, 11]);
  });
});

describe("matchChord", () => {
  it("识别大三和弦", () => {
    // A 大三和弦 = A(57) C#(61) E(64)
    expect(matchChord([57, 61, 64], 9)).toEqual({ root: 9, quality: "maj" });
  });

  it("识别小三和弦", () => {
    // A 小三和弦 = A(57) C(60) E(64)
    expect(matchChord([57, 60, 64], 9)).toEqual({ root: 9, quality: "min" });
  });

  it("优先匹配更具体的色彩和弦", () => {
    expect(matchChord([57, 61, 64, 68], 9)).toEqual({ root: 9, quality: "maj7" });
    expect(matchChord([57, 61, 64, 71], 9)).toEqual({ root: 9, quality: "add9" });
    expect(matchChord([57, 60, 64, 67], 9)).toEqual({ root: 9, quality: "min7" });
  });

  it("无法归类时返回 null", () => {
    // 只有 C D E，缺少根音 A，任何和弦模板都凑不齐，返回 null 而不是硬凑一个
    expect(matchChord([60, 61, 62], 9)).toBeNull();
  });
});

describe("romanNumeral", () => {
  it("大调：调内级数", () => {
    expect(romanNumeral({ root: 9, quality: "maj" }, 9)).toBe("I");
    expect(romanNumeral({ root: 11, quality: "min" }, 9)).toBe("ii");
    expect(romanNumeral({ root: 2, quality: "maj" }, 9)).toBe("IV");
    expect(romanNumeral({ root: 4, quality: "maj" }, 9)).toBe("V");
    expect(romanNumeral({ root: 6, quality: "min" }, 9)).toBe("vi");
  });

  it("大调：借用和弦加 ♭ 前缀", () => {
    expect(romanNumeral({ root: 10, quality: "maj" }, 0)).toBe("♭VII");
    expect(romanNumeral({ root: 3, quality: "maj" }, 0)).toBe("♭III");
  });

  it("小调：以平行大调为参考，流行记谱习惯", () => {
    expect(romanNumeral({ root: 9, quality: "min" }, 9)).toBe("i");
    expect(romanNumeral({ root: 5, quality: "maj" }, 9)).toBe("♭VI");
    expect(romanNumeral({ root: 0, quality: "maj" }, 9)).toBe("♭III");
    expect(romanNumeral({ root: 7, quality: "maj" }, 9)).toBe("♭VII");
    expect(romanNumeral({ root: 4, quality: "maj" }, 9)).toBe("V");
    expect(romanNumeral({ root: 2, quality: "min" }, 9)).toBe("iv");
    expect(romanNumeral({ root: 11, quality: "dim" }, 9)).toBe("ii°");
  });

  it("7 级 + 降半音参考已覆盖全部 12 个根音，不会出现 ?", () => {
    // A 调里 C# 正好是第 3 级参考音 → III；D# 比第 5 级参考音 E 低半音 → ♭V
    expect(romanNumeral({ root: 1, quality: "maj" }, 9)).toBe("III");
    expect(romanNumeral({ root: 3, quality: "maj" }, 9)).toBe("♭V");
  });
});
