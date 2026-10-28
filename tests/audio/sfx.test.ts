import { describe, expect, it } from "vitest";
import { sfxSteps } from "../../src/core/audio/sfx.ts";
import { SCALE_INTERVALS, getScalePitches } from "../../src/core/theory/scale.ts";

const SCALES = ["major", "naturalMinor", "harmonicMinor", "melodicMinor"] as const;

/**
 * 反馈音效的音高关系。
 *
 * 断言的不是「具体是哪个 MIDI 音」，而是**音程关系**——
 * 因为关系的语义才是设计意图：
 * 答对 = 上行，答错 = 下行，过关 = 琶音展开。
 * 关系对了，具体音高随便换都不影响设计意图。
 */
describe("反馈音效的音程关系", () => {
  it("答对：调内上行", () => {
    const steps = sfxSteps("correct");
    expect(steps).toHaveLength(2);
    const [first, second] = steps;
    // 上行
    expect(second!.midi).toBeGreaterThan(first!.midi);
    // 差值是调内三度（大调里是 4 个半音）
    expect(second!.midi - first!.midi).toBe(SCALE_INTERVALS.major[2]);
  });

  it("答错：下行二度", () => {
    const steps = sfxSteps("wrong");
    expect(steps).toHaveLength(2);
    const [first, second] = steps;
    expect(second!.midi).toBeLessThan(first!.midi);
    // 下行二度 = 2 个半音
    expect(first!.midi - second!.midi).toBe(2);
  });

  it("答错比答对低：低八度起步", () => {
    const correct = sfxSteps("correct");
    const wrong = sfxSteps("wrong");
    expect(wrong[0]!.midi).toBeLessThan(correct[0]!.midi);
  });

  it("过关：三和弦琶音，最后落在八度", () => {
    const steps = sfxSteps("pass");
    expect(steps.length).toBeGreaterThanOrEqual(4);
    // 严格上行
    for (let index = 1; index < steps.length; index += 1) {
      expect(steps[index]!.midi).toBeGreaterThan(steps[index - 1]!.midi);
    }
    // 最后一个音比第一个音高一个八度
    const span = steps[steps.length - 1]!.midi - steps[0]!.midi;
    expect(span).toBe(12);
  });

  it("三个音效的时序都不重叠成噪声", () => {
    for (const cue of ["correct", "wrong", "pass"] as const) {
      const steps = sfxSteps(cue);
      for (let index = 1; index < steps.length; index += 1) {
        // 后一个音至少在���一个音开始之后才响
        expect(steps[index]!.offset).toBeGreaterThan(steps[index - 1]!.offset);
      }
    }
  });
});

describe("音效跟着关卡的调走", () => {
  it("换调之后，答对的上行音程仍然是调内三度", () => {
    for (const scale of ["major", "naturalMinor", "harmonicMinor", "melodicMinor"] as const) {
      for (let root = 0; root < 12; root += 1) {
        const steps = sfxSteps("correct", { keyRoot: root as 0, keyScale: scale });
        const [first, second] = steps;
        expect(second!.midi - first!.midi).toBe(SCALE_INTERVALS[scale][2]);
        // 第一个音就是根音本身
        expect((first!.midi % 12)).toBe(root);
      }
    }
  });

  it("根音换了就整体跟着换", () => {
    const c = sfxSteps("correct", { keyRoot: 0 });
    const f = sfxSteps("correct", { keyRoot: 5 });
    expect(f[0]!.midi).toBe(c[0]!.midi + 5);
  });
});

describe("连对爬音阶", () => {
  it("streak 缺省、streak 1、streak 0 都等于原来的答对音", () => {
    const plain = sfxSteps("correct");
    expect(sfxSteps("correct", { streak: 1 })).toEqual(plain);
    expect(sfxSteps("correct", { streak: 0 })).toEqual(plain);
  });

  it("1–5 档：第一个音严格上行，两个音都在调内，间隔是调内三度", () => {
    for (const keyScale of SCALES) {
      for (let keyRoot = 0; keyRoot < 12; keyRoot += 1) {
        const inKey = new Set<number>(getScalePitches(keyRoot as never, keyScale));
        let previous = -Infinity;
        for (let streak = 1; streak <= 5; streak += 1) {
          const [first, second] = sfxSteps("correct", { keyRoot: keyRoot as never, keyScale, streak });
          expect(first.midi).toBeGreaterThan(previous);
          previous = first.midi;
          expect(inKey.has(first.midi % 12)).toBe(true);
          expect(inKey.has(second.midi % 12)).toBe(true);
          expect([3, 4]).toContain(second.midi - first.midi);
        }
      }
    }
  });

  it("超过 5 档封顶，不再往上爬", () => {
    expect(sfxSteps("correct", { streak: 9 })).toEqual(sfxSteps("correct", { streak: 5 }));
  });
});

describe("select 与 milestone", () => {
  it("select：一个很轻的短音，落在调内第 5 级", () => {
    const steps = sfxSteps("select", { keyRoot: 2, keyScale: "major" });
    expect(steps).toHaveLength(1);
    expect(steps[0].duration).toBeLessThanOrEqual(0.08);
    expect(steps[0].gain).toBeLessThan(1);
    expect((steps[0].midi - 2) % 12).toBe(7);
  });

  it("milestone：主三和弦同时响，整体排在答对音之后", () => {
    for (const keyScale of SCALES) {
      const steps = sfxSteps("milestone", { keyRoot: 0, keyScale });
      expect(steps).toHaveLength(3);
      const offsets = new Set(steps.map((step) => step.offset));
      expect(offsets.size).toBe(1);
      const correctEnd = Math.max(...sfxSteps("correct").map((step) => step.offset));
      expect(steps[0].offset).toBeGreaterThan(correctEnd);
      const root = steps[0].midi;
      expect(steps.map((step) => step.midi - root)).toEqual([0, SCALE_INTERVALS[keyScale][2], SCALE_INTERVALS[keyScale][4]]);
    }
  });

  it("milestone 的根音在连对第 5 题最后一个音上方一两个半音：往上解决到主音", () => {
    for (const options of [
      { keyRoot: 0, keyScale: "major" },
      { keyRoot: 9, keyScale: "naturalMinor" },
    ] as const) {
      const root = sfxSteps("milestone", options)[0].midi;
      const lastCorrect = sfxSteps("correct", { ...options, streak: 5 }).at(-1)!.midi;
      expect(root).toBeGreaterThan(lastCorrect);
      expect([1, 2]).toContain(root - lastCorrect);
    }
  });
});
