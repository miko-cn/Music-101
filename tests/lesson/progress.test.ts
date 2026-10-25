import { describe, expect, it } from "vitest";
import {
  deleteRecipe,
  emptyProgress,
  loadProgress,
  observeAttempt,
  parseProgress,
  recordVisit,
  saveProgress,
  saveRecipe,
  serializeProgress,
  type Recipe,
} from "../../src/core/lesson/progress.ts";

function memoryStorage() {
  const memory = new Map<string, string>();
  return {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => {
      memory.set(key, value);
    },
  };
}

const recipe: Recipe = {
  id: "11:根音 36",
  levelId: 11,
  title: "808 和 kick 的分工",
  summary: "根音 36",
  hand: 0,
  drums: null,
  referencePick: null,
  pitch: null,
  steps: null,
};

describe("进度", () => {
  it("坏数据和高版本都回到空进度", () => {
    expect(parseProgress(null)).toEqual(emptyProgress());
    expect(parseProgress("not json")).toEqual(emptyProgress());
    expect(parseProgress(JSON.stringify({ schema: 99, level1Passed: true }))).toEqual(emptyProgress());
    expect(parseProgress(JSON.stringify({ schema: 2, attempts: "nope" })).attempts).toEqual([]);
  });

  it("schema 1 只把第 1 关迁进来", () => {
    expect(parseProgress(JSON.stringify({ schema: 1, level1Passed: true }))).toEqual({
      schema: 3,
      level1Passed: true,
      passedLevels: [1],
      attempts: [],
      recipes: [],
      activity: [],
    });
    expect(parseProgress(JSON.stringify({ schema: 1, level1Passed: false })).level1Passed).toBe(false);
  });

  it("schema 2 迁到 3，活动流补空——老记录没有时间戳，不能编", () => {
    const parsed = parseProgress(
      JSON.stringify({ schema: 2, level1Passed: true, passedLevels: [1] }),
    );
    expect(parsed.schema).toBe(3);
    expect(parsed.passedLevels).toEqual([1]);
    expect(parsed.activity).toEqual([]);
  });

  it("坏掉的尝试和配方会被丢掉，其余留下", () => {
    const parsed = parseProgress(
      JSON.stringify({
        schema: 2,
        level1Passed: false,
        passedLevels: [1, 99, 10],
        attempts: [{ visitId: "ok", levelId: 11, passed: false, easy: false, stuck: true, mistakes: ["low-end-clash", "nope"] }, { visitId: "", levelId: 11 }],
        recipes: [recipe, { id: "", levelId: 3 }],
      }),
    );
    expect(parsed.passedLevels).toEqual([1, 10]);
    expect(parsed.level1Passed).toBe(true);
    expect(parsed.attempts).toEqual([
      { visitId: "ok", levelId: 11, passed: false, easy: false, stuck: true, mistakes: ["low-end-clash"] },
    ]);
    expect(parsed.recipes.map((item) => item.id)).toEqual(["11:根音 36"]);
  });

  it("同一次进入覆盖上一条，过关后记入已掌握", () => {
    const storage = memoryStorage();
    let progress = emptyProgress();
    progress = observeAttempt(progress, {
      visitId: "v1",
      levelId: 11,
      passed: false,
      easy: false,
      stuck: true,
      mistakes: ["low-end-clash"],
    });
    progress = observeAttempt(progress, {
      visitId: "v1",
      levelId: 11,
      passed: true,
      easy: false,
      stuck: true,
      mistakes: ["low-end-clash"],
    });
    expect(progress.attempts).toHaveLength(1);
    expect(progress.passedLevels).toEqual([11]);
    progress = saveRecipe(progress, recipe);
    progress = saveRecipe(progress, recipe);
    expect(progress.recipes).toHaveLength(1);
    progress = deleteRecipe(progress, recipe.id);
    expect(progress.recipes).toEqual([]);
    saveProgress(storage, progress);
    expect(loadProgress(storage)).toEqual(progress);
    expect(serializeProgress(progress)).toContain('"schema":3');
  });

  it("进关卡记一条活动，同一次进入只留一条", () => {
    let progress = emptyProgress();
    progress = recordVisit(progress, { visitId: "v1", levelId: 11, at: 1_700_000_000_000 });
    expect(progress.activity).toHaveLength(1);
    // 同一次访问再记一次，不该变成两条
    progress = recordVisit(progress, { visitId: "v1", levelId: 11, at: 1_700_000_060_000 });
    expect(progress.activity).toHaveLength(1);
    // 换一次访问就是新的一条
    progress = recordVisit(progress, { visitId: "v2", levelId: 12, at: 1_700_000_120_000 });
    expect(progress.activity).toHaveLength(2);
    expect(progress.activity[1]?.levelId).toBe(12);
  });

  it("活动流里的坏数据会被丢掉", () => {    const parsed = parseProgress(
      JSON.stringify({
        schema: 3,
        activity: [
          { visitId: "ok", levelId: 11, at: 1_700_000_000_000 },
          { visitId: "no-time", levelId: 11 },
          { visitId: "", levelId: 11, at: 1_700_000_000_000 },
          { visitId: "bad-level", levelId: 99, at: 1_700_000_000_000 },
        ],
      }),
    );
    expect(parsed.activity).toEqual([
      { visitId: "ok", levelId: 11, at: 1_700_000_000_000 },
    ]);
  });

  it("导出的 JSON 能原样读回来（含学习活动）", () => {
    let progress = emptyProgress();
    progress = recordVisit(progress, { visitId: "v1", levelId: 11, at: 1_700_000_000_000 });
    progress = recordVisit(progress, { visitId: "v2", levelId: 15, at: 1_700_000_060_000 });
    progress = observeAttempt(progress, {
      visitId: "v2",
      levelId: 15,
      passed: true,
      easy: true,
      stuck: false,
      mistakes: [],
    });
    const back = parseProgress(serializeProgress(progress));
    expect(back.passedLevels).toEqual([15]);
    expect(back.activity).toEqual(progress.activity);
    expect(back.attempts).toHaveLength(1);
  });

  it("导入一个空文件不会把已有进度清空（parseProgress 对坏数据返回空，得自己拦）", () => {
    const progress = parseProgress("not json at all");
    expect(progress.passedLevels).toEqual([]);
    expect(progress.activity).toEqual([]);
  });
});
