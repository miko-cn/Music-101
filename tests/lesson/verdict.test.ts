import { describe, expect, it } from "vitest";
import {
  answerVerdict,
  anchorHint,
  sfxForVerdict,
} from "../../src/core/lesson/verdict.ts";
import { praiseLine, retryLine } from "../../src/core/lesson/copy.ts";

describe("作答判定", () => {
  it("没选是 idle", () => {
    expect(answerVerdict(null, 0)).toBe("idle");
    expect(answerVerdict(undefined, 0)).toBe("idle");
  });

  it("选对了是 correct，选错了是 wrong", () => {
    expect(answerVerdict(1, 1)).toBe("correct");
    expect(answerVerdict(0, 1)).toBe("wrong");
  });

  it("改了答案会重新判定", () => {
    // 先选错再改对：判定跟着最新的答案走。
    expect(answerVerdict(0, 2)).toBe("wrong");
    expect(answerVerdict(2, 2)).toBe("correct");
  });
});

describe("判定对应的音效", () => {
  it("idle 不发声", () => {
    // 没作答时响一下是在催人。
    expect(sfxForVerdict("idle")).toBeNull();
  });

  it("对和错各对应一种", () => {
    expect(sfxForVerdict("correct")).toBe("correct");
    expect(sfxForVerdict("wrong")).toBe("wrong");
  });
});

describe("答错时给的引导", () => {
  it("指向记忆锚，但不报答案", () => {
    const hint = anchorHint("相邻键法", "半音是隔壁，全音隔一个。");
    expect(hint).toContain("相邻键法");
    expect(hint).toContain("半音是隔壁");
  });
});

describe("反馈文案按题号轮换", () => {
  it("同一个种子永远给同一句", () => {
    expect(praiseLine(3)).toBe(praiseLine(3));
    expect(retryLine(3)).toBe(retryLine(3));
  });

  it("不同的题号给不同的句子", () => {
    const lines = new Set([0, 1, 2, 3, 4].map((seed) => praiseLine(seed)));
    expect(lines.size).toBeGreaterThan(1);
  });

  it("文案里带标点，读起来是完整的一句话", () => {
    for (let seed = 0; seed < 10; seed += 1) {
      expect(praiseLine(seed)).toMatch(/[。！？]$/);
      expect(retryLine(seed)).toMatch(/[。！？]$/);
    }
  });
});
