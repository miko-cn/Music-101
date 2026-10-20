import { describe, expect, it } from "vitest";
import {
  isQuarterBar,
  quarterSteps,
  resizeSteps,
  toggleStep,
} from "../../src/core/sequencer/grid.ts";

describe("16 格步进器", () => {
  it("四个四分音符只打开每拍的第一格", () => {
    const steps = quarterSteps();
    expect(steps).toHaveLength(16);
    expect(isQuarterBar(steps)).toBe(true);
    expect(steps.filter(Boolean)).toHaveLength(4);
  });

  it("多开或少开一格就不算四分音符", () => {
    const steps = quarterSteps();
    expect(isQuarterBar(toggleStep(steps, 1))).toBe(false);
    expect(isQuarterBar(toggleStep(steps, 0))).toBe(false);
  });

  it("切到两小节时保留原来的 16 格", () => {
    const steps = toggleStep(quarterSteps(), 0);
    const wider = resizeSteps(steps, 2);
    expect(wider).toHaveLength(32);
    expect(wider[0]).toBe(false);
    expect(wider[4]).toBe(true);
    expect(wider[16]).toBe(false);
    expect(resizeSteps(wider, 1)).toHaveLength(16);
  });
});
