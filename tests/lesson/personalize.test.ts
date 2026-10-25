import { describe, expect, it } from "vitest";
import { FLOW_LESSONS } from "../../src/content/index.ts";
import { emptyStageState } from "../../src/core/lesson/stage1.ts";
import {
  abilityScores,
  activeDrills,
  applyRecipeToStage,
  buildAttempt,
  classifyHand,
  difficultyAdvice,
  levelLocked,
  levelStatus,
  mistakeCounts,
  recipeFromStage,
  recommendationLists,
} from "../../src/core/lesson/personalize.ts";
import { emptyProgress, observeAttempt, saveRecipe, type ProgressFile } from "../../src/core/lesson/progress.ts";

function withAttempts(progress: ProgressFile, attempts: ProgressFile["attempts"]): ProgressFile {
  return { ...progress, attempts };
}

describe("定制化", () => {
  it("选错才记三类错误，选对不计", () => {
    expect(classifyHand(8, 1, 0)).toEqual(["same-progression"]);
    expect(classifyHand(11, 1, 0)).toEqual(["low-end-clash"]);
    expect(classifyHand(13, 1, 0)).toEqual(["chorus-flat"]);
    expect(classifyHand(25, 1, 0)).toEqual(["chorus-flat"]);
    expect(classifyHand(26, 1, 0)).toEqual(["chorus-flat"]);
    expect(classifyHand(7, 0, 0)).toEqual([]);
    expect(classifyHand(11, 0, 0)).toEqual([]);
  });

  it("同一类错误满两次，并且已经走过那一关，才插入针对练习", () => {
    let progress = emptyProgress();
    for (const visitId of ["a", "b"]) {
      progress = observeAttempt(
        progress,
        buildAttempt({
          visitId,
          levelId: 11,
          passed: false,
          earCorrect: 5,
          earTotal: 5,
          usedFix: false,
          mistakes: classifyHand(11, 1, 0),
        }),
      );
    }
    expect(mistakeCounts(progress)["low-end-clash"]).toBe(2);
    expect(activeDrills(progress, 11)).toEqual([]);
    expect(activeDrills(progress, 12).map((item) => item.kind)).toEqual(["low-end-clash"]);
  });

  it("已掌握可以跳过，没过可以重开，但没有任何关卡被锁", () => {
    let progress = observeAttempt(emptyProgress(), {
      visitId: "pass-10",
      levelId: 10,
      passed: true,
      easy: true,
      stuck: false,
      mistakes: [],
    });
    progress = observeAttempt(progress, {
      visitId: "fail-13",
      levelId: 13,
      passed: false,
      easy: false,
      stuck: true,
      mistakes: ["chorus-flat"],
    });
    expect(levelStatus(progress, 10)).toBe("mastered");
    expect(levelStatus(progress, 13)).toBe("retry");
    expect(levelStatus(progress, 9)).toBe("new");
    expect(recommendationLists(progress)).toEqual({ mastered: [10], retry: [13] });
    for (let levelId = 1; levelId <= 27; levelId += 1) {
      expect(levelLocked(progress, levelId)).toBe(false);
    }
  });

  it("节奏维度按已掌握的关卡数算雷达分数", () => {
    const progress = observeAttempt(emptyProgress(), {
      visitId: "pass-10",
      levelId: 10,
      passed: true,
      easy: true,
      stuck: false,
      mistakes: [],
    });
    const rhythm = abilityScores(progress).find((item) => item.id === "rhythm");
    expect(rhythm).toMatchObject({ passed: 1, total: 2, ratio: 0.5 });
  });

  it("连续三次轻松提示变难，连续两次卡住提示复习上一关", () => {
    const easy = { visitId: "e", levelId: 2, passed: true, easy: true, stuck: false, mistakes: [] };
    expect(
      difficultyAdvice([
        { ...easy, visitId: "e1" },
        { ...easy, visitId: "e2" },
        { ...easy, visitId: "e3" },
      ])?.kind,
    ).toBe("harder");
    const stuck = { visitId: "s", levelId: 14, passed: false, easy: false, stuck: true, mistakes: [] };
    expect(difficultyAdvice([{ ...stuck, visitId: "s1" }, { ...stuck, visitId: "s2", levelId: 15 }])).toMatchObject({
      kind: "review",
      reviewLevel: 14,
    });
    expect(
      buildAttempt({ visitId: "x", levelId: 4, passed: true, earCorrect: 4, earTotal: 5, usedFix: false, mistakes: [] }).easy,
    ).toBe(false);
  });

  it("配方按关卡存下来，套用后手做选项回来", () => {
    const lesson = FLOW_LESSONS.find((item) => item.id === 11);
    if (!lesson) throw new Error("缺少第 11 关");
    const state = { ...emptyStageState(lesson), hand: 0 };
    const recipe = recipeFromStage(lesson, state);
    const progress = saveRecipe(emptyProgress(), recipe);
    expect(progress.recipes).toHaveLength(1);
    const applied = applyRecipeToStage({ ...emptyStageState(lesson), hand: null }, progress.recipes[0] ?? recipe);
    expect(applied.hand).toBe(0);
  });

  it("同一次进入用修正过关仍算卡住，轻松过关不记错误", () => {
    const attempt = buildAttempt({
      visitId: "fix",
      levelId: 13,
      passed: true,
      earCorrect: 5,
      earTotal: 5,
      usedFix: true,
      mistakes: ["chorus-flat"],
    });
    expect(attempt.stuck).toBe(true);
    expect(attempt.easy).toBe(false);
    expect(attempt.mistakes).toEqual(["chorus-flat"]);
    const progress = withAttempts(emptyProgress(), [attempt]);
    expect(mistakeCounts(progress)["chorus-flat"]).toBe(1);
  });
});
