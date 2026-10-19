import { describe, expect, it } from "vitest";
import { getInterval } from "../../src/core/theory/interval.ts";

describe("getInterval", () => {
  it("识别大三度、纯五、纯八", () => {
    expect(getInterval(60, 64).semitones).toBe(4);
    expect(getInterval(60, 64).shortName).toBe("M3");
    expect(getInterval(60, 67).shortName).toBe("P5");
    expect(getInterval(60, 72).shortName).toBe("P8");
  });

  it("小二度与大三度区分得开", () => {
    expect(getInterval(60, 61).shortName).toBe("m2");
    expect(getInterval(60, 62).shortName).toBe("M2");
  });

  it("不区分方向", () => {
    expect(getInterval(64, 60).shortName).toBe("M3");
  });

  it("协和度排序：纯五 > 三度 > 二度", () => {
    expect(getInterval(60, 67).consonance).toBeGreaterThan(getInterval(60, 64).consonance);
    expect(getInterval(60, 64).consonance).toBeGreaterThan(getInterval(60, 62).consonance);
  });
});
