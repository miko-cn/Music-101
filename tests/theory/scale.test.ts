import { describe, expect, it } from "vitest";
import {
  degreeOfPitch,
  getScalePitches,
  isInScale,
  keyName,
} from "../../src/core/theory/scale.ts";

describe("getScalePitches", () => {
  it("A 大调", () => {
    expect(getScalePitches(9, "major")).toEqual([9, 11, 1, 2, 4, 6, 8]);
  });

  it("A 自然小调", () => {
    expect(getScalePitches(9, "naturalMinor")).toEqual([9, 11, 0, 2, 4, 5, 7]);
  });

  it("A 和声小调的第 7 级升高", () => {
    expect(getScalePitches(9, "harmonicMinor")).toEqual([9, 11, 0, 2, 4, 5, 8]);
  });

  it("A 旋律小调的第 6、7 级升高", () => {
    expect(getScalePitches(9, "melodicMinor")).toEqual([9, 11, 0, 2, 4, 6, 8]);
  });
});

describe("isInScale / degreeOfPitch", () => {
  it("判定调内与级数", () => {
    expect(isInScale(61, 9, "major")).toBe(true);
    expect(isInScale(60, 9, "major")).toBe(false);
    expect(isInScale(60, 9, "naturalMinor")).toBe(true);
    expect(isInScale(61, 9, "naturalMinor")).toBe(false);
  });

  it("级数从 1 开始，不在调内返回 null", () => {
    expect(degreeOfPitch(61, 9, "major")).toBe(3);
    expect(degreeOfPitch(57, 9, "major")).toBe(1);
    expect(degreeOfPitch(61, 9, "naturalMinor")).toBeNull();
  });
});

describe("keyName", () => {
  it("给出可读的调名", () => {
    expect(keyName(9, "major")).toBe("A 大调");
    expect(keyName(6, "naturalMinor")).toBe("F# 自然小调");
  });
});
