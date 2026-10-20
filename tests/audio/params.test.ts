import { describe, expect, it } from "vitest";
import {
  SUPERSAW_CENTS,
  kickVoice,
  saturationCurve,
  sidechainAutomation,
} from "../../src/core/audio/params.ts";
import { stepSeconds, takeDue } from "../../src/core/audio/schedule.ts";

describe("合成积木参数", () => {
  it("kick 的音高包络从 60Hz 落到 40Hz", () => {
    const kick = kickVoice();
    expect(kick.startHz).toBe(60);
    expect(kick.endHz).toBe(40);
    expect(kick.endHz).toBeLessThan(kick.startHz);
  });

  it("supersaw 是 7 路对称失谐", () => {
    expect(SUPERSAW_CENTS).toHaveLength(7);
    expect(SUPERSAW_CENTS[3]).toBe(0);
    expect(SUPERSAW_CENTS[0]).toBe(-(SUPERSAW_CENTS[6] ?? 0));
  });

  it("饱和曲线两端被压进 (-1, 1)，并且关于 0 对称", () => {
    const curve = saturationCurve(5, 2);
    expect(curve[0]).toBeLessThan(0);
    expect(curve[0]).toBeGreaterThan(-1);
    expect(curve[4]).toBeGreaterThan(0);
    expect(curve[4]).toBeLessThan(1);
    expect(curve[2]).toBeCloseTo(0, 5);
    expect(curve[0]).toBeCloseTo(-(curve[4] ?? 0), 5);
  });

  it("侧链在触发格压到 0.2，再回到 1", () => {
    const points = sidechainAutomation([0, 4], 0.125);
    expect(points[0]).toEqual({ time: 0, gain: 1 });
    expect(points).toContainEqual({ time: 0, gain: 0.2 });
    expect(points).toContainEqual({ time: 0.5, gain: 0.2 });
    expect(points.filter((point) => point.gain === 1).length).toBeGreaterThan(1);
  });
});

describe("步进调度", () => {
  it("120 BPM 时十六分音符是 0.125 秒", () => {
    expect(stepSeconds(120)).toBeCloseTo(0.125, 6);
  });

  it("只取出 lookahead 窗口里还没排的格子", () => {
    const due = takeDue(0, 0, 0.2, 0.2, 0.125, 16);
    expect(due.events.map((event) => event.index)).toEqual([2, 3]);
    expect(due.nextIndex).toBe(4);
  });
});
