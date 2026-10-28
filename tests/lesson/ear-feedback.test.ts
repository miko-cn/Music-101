import { describe, expect, it } from "vitest";
import { FLOW_LESSONS, LESSONS } from "../../src/content/index.ts";
import { LEVEL1_EAR } from "../../src/content/lessons/level-01.ts";
import { isStageLesson } from "../../src/content/types.ts";

/**
 * 听辨题反馈文案的守卫。
 *
 * P2 把 `explain` 一个字段拆成三个：`explain`（解析）、`wrongHint`（答错引导）、
 * `encourage`（答对反应）。拆开之后有个新风险：**新加关卡时忘了写新字段**。
 *
 * 字段是可选的（`wrongHint?`），所以忘了写不会报错——只会悄悄退回
 * 整关通用的记忆锚提示，那道题就失去了针对性。
 *
 * 这几条断言把「忘了写」变成编译期就能发现的事。
 */

/** 第 1 关的听辨题。 */
const LEVEL1_QUESTIONS = LEVEL1_EAR;

/** 走标准流程的关卡的听辨题。 */
const STAGE_QUESTIONS = FLOW_LESSONS.flatMap((lesson) =>
  lesson.ear.map((question) => ({ levelId: lesson.id, question })),
);

const ALL_QUESTIONS = [
  ...LEVEL1_QUESTIONS.map((question) => ({ levelId: 1, question })),
  ...STAGE_QUESTIONS,
];

describe("听辨题的反馈文案", () => {
  it("每道题都写了答错时的引导方向", () => {
    for (const { levelId, question } of ALL_QUESTIONS) {
      expect(
        question.wrongHint,
        `第 ${levelId} 关「${question.id}」没写 wrongHint`,
      ).toBeTruthy();
    }
  });

  it("每道题都写了答对时的反应", () => {
    for (const { levelId, question } of ALL_QUESTIONS) {
      expect(
        question.encourage,
        `第 ${levelId} 关「${question.id}」没写 encourage`,
      ).toBeTruthy();
    }
  });

  it("引导方向不是解析的复制", () => {
    // wrongHint 和 explain 写成同一句，等于没拆——
    // 解析里通常直接写着答案，复制过来就把答案泄露出去了。
    for (const { levelId, question } of ALL_QUESTIONS) {
      expect(
        question.wrongHint,
        `第 ${levelId} 关「${question.id}」的 wrongHint 和 explain 一样`,
      ).not.toBe(question.explain);
      expect(
        question.encourage,
        `第 ${levelId} 关「${question.id}」的 encourage 和 explain 一样`,
      ).not.toBe(question.explain);
    }
  });

  it("引导方向有实质内容，不是敷衍的短句", () => {
    for (const { levelId, question } of ALL_QUESTIONS) {
      const hint = question.wrongHint ?? "";
      expect(
        hint.length,
        `第 ${levelId} 关「${question.id}」的 wrongHint 太短`,
      ).toBeGreaterThanOrEqual(10);
      expect(
        hint.length,
        `第 ${levelId} 关「${question.id}」的 wrongHint 太长`,
      ).toBeLessThanOrEqual(60);
    }
  });

  it("答对时的反应也要有实质内容", () => {
    for (const { levelId, question } of ALL_QUESTIONS) {
      const encourage = question.encourage ?? "";
      expect(
        encourage.length,
        `第 ${levelId} 关「${question.id}」的 encourage 太短`,
      ).toBeGreaterThanOrEqual(6);
      expect(
        encourage.length,
        `第 ${levelId} 关「${question.id}」的 encourage 太长`,
      ).toBeLessThanOrEqual(45);
    }
  });

  it("引导方向不会直接说出正确答案的文字", () => {
    // 最要命的一种错误：wrongHint 里写了正确项的文字。
    // 逐题比对——正确项的 label 不能出现在 wrongHint 里。
    for (const { levelId, question } of ALL_QUESTIONS) {
      const correct = question.choices[question.correct];
      const hint = question.wrongHint ?? "";
      if (!correct) continue;
      const label = correct.label.trim();
      // 短标签（如 "2"）容易误伤，只查有辨识度的。
      if (label.length < 3) continue;
      expect(
        hint.includes(label),
        `第 ${levelId} 关「${question.id}」的 wrongHint 泄露了正确答案「${label}」`,
      ).toBe(false);
    }
  });

  it("反馈文案不是从别的题复制来的", () => {
    // 同一关里两道题用一模一样的引导，等于其中一道没写。
    for (const lesson of FLOW_LESSONS) {
      const hints = lesson.ear.map((question) => question.wrongHint ?? "");
      expect(
        new Set(hints).size,
        `第 ${lesson.id} 关有几道题的 wrongHint 完全一样`,
      ).toBe(hints.length);
    }
  });

  it("27 关和第 1 关的听辨题都在守卫范围内", () => {
    expect(ALL_QUESTIONS.length).toBe(
      LESSONS.reduce((sum, lesson) => sum + (isStageLesson(lesson) ? lesson.ear.length : 0), 0) +
        LEVEL1_QUESTIONS.length,
    );
    expect(ALL_QUESTIONS.length).toBeGreaterThanOrEqual(170);
  });
});

describe("盲听题", () => {
  const blind = FLOW_LESSONS.flatMap((lesson) =>
    lesson.ear.filter((question) => question.blind).map((question) => ({ lesson, question })),
  );

  it("至少开了一批", () => {
    expect(blind.length).toBeGreaterThanOrEqual(10);
  });

  it("选项的声音两两不同——否则盲听等于瞎猜", () => {
    for (const { lesson, question } of blind) {
      const sounds = question.choices.map((choice) => JSON.stringify(choice.midis));
      expect(new Set(sounds).size, `第 ${lesson.id} 关 ${question.id}`).toBe(sounds.length);
    }
  });

  it("只在 2–8 关和 14–17 关开：阶段二、三别处的 midis 是层数编码，不是真音高", () => {
    for (const { lesson, question } of blind) {
      const ok = (lesson.id >= 2 && lesson.id <= 8) || (lesson.id >= 14 && lesson.id <= 17);
      expect(ok, `第 ${lesson.id} 关 ${question.id}`).toBe(true);
    }
  });
});
