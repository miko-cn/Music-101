import { describe, expect, it } from "vitest";
import { FLOW_LESSONS } from "../../src/content/index.ts";

const TARGETS = new Set([13, 20, 25, 27]);

function mute(question: { choices: { midis: number[] }[] }): boolean {
  return new Set(question.choices.map((choice) => JSON.stringify(choice.midis))).size === 1;
}

describe("哑巴听辨：改成真耳朵或改名", () => {
  it("第 13 / 20 / 25 关叫听辨时选项声音必须能听出差别", () => {
    for (const lesson of FLOW_LESSONS.filter((item) => TARGETS.has(item.id) && item.id !== 27)) {
      const title = lesson.earTitle ?? "听辨";
      expect(title).toBe("听辨");
      const silent = lesson.ear.filter(mute).map((question) => question.id);
      expect(silent, `第 ${lesson.id} 关仍有哑巴题：${silent.join("、")}`).toEqual([]);
    }
  });

  it("第 27 关读题步不叫听辨", () => {
    const lesson = FLOW_LESSONS.find((item) => item.id === 27);
    expect(lesson).toBeDefined();
    expect(lesson!.earTitle).toBe("核对");
    expect(lesson!.earTitle).not.toBe("听辨");
  });
});
