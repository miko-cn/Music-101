import { describe, expect, it } from "vitest";
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  ABILITIES,
  FLOW_LESSONS,
  LESSONS,
  MAX_LEVEL_ID,
  STAGES,
  abilityOf,
  anchorOf,
  levelsForAbility,
  lessonById,
  stageLesson,
  validateCurriculum,
} from "../../src/content/index.ts";
import { isStageLesson } from "../../src/content/types.ts";
import { MISTAKE_KINDS } from "../../src/core/lesson/mistakes.ts";
import { MISTAKE_DRILLS, classifyHand } from "../../src/core/lesson/personalize.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const LESSONS_DIR = join(HERE, "..", "..", "src", "content", "lessons");

describe("课程结构自洽", () => {
  it("课程自检没有发现问题", () => {
    expect(validateCurriculum()).toEqual([]);
  });

  it("关号是 1 到 N 连续的，没有跳号也没有重号", () => {
    expect(LESSONS.map((lesson) => lesson.id)).toEqual(
      Array.from({ length: LESSONS.length }, (_, index) => index + 1),
    );
    expect(MAX_LEVEL_ID).toBe(LESSONS.length);
  });

  it("每关都声明了阶段、能力、记忆锚和标题", () => {
    for (const lesson of LESSONS) {
      expect(lesson.title.trim().length, `第 ${lesson.id} 关缺标题`).toBeGreaterThan(0);
      expect(lesson.stage, `第 ${lesson.id} 关缺阶段`).toBeTruthy();
      expect(lesson.ability, `第 ${lesson.id} 关缺能力维度`).toBeTruthy();
      expect(lesson.anchor.id, `第 ${lesson.id} 关缺记忆锚`).toBeTruthy();
    }
  });

  it("阶段分组不重不漏，每一关都归到一个阶段", () => {
    const grouped = STAGES.flatMap((stage) => stage.levelIds);
    expect([...grouped].sort((a, b) => a - b)).toEqual(LESSONS.map((lesson) => lesson.id));
    for (const stage of STAGES) {
      expect(stage.levelIds.length, `阶段 ${stage.id} 是空的`).toBeGreaterThan(0);
    }
  });

  it("能力维度不重不漏地覆盖全部关卡", () => {
    const covered = ABILITIES.flatMap((ability) => levelsForAbility(ability.id));
    expect([...covered].sort((a, b) => a - b)).toEqual(LESSONS.map((lesson) => lesson.id));
    for (const lesson of LESSONS) {
      expect(abilityOf(lesson.id)).toBe(lesson.ability);
    }
  });

  it("关卡目录里每关一个文件，文件名跟关号对得上", () => {
    const files = readdirSync(LESSONS_DIR)
      .filter((name) => name.endsWith(".ts"))
      .sort();
    expect(files).toEqual(
      LESSONS.map((lesson) => `level-${String(lesson.id).padStart(2, "0")}.ts`),
    );
  });

  it("前置关卡指向更早、且确实存在的关卡", () => {
    for (const lesson of FLOW_LESSONS) {
      for (const prereq of lesson.prereq ?? []) {
        expect(lessonById(prereq), `第 ${lesson.id} 关的前置 ${prereq} 不存在`).not.toBeNull();
        expect(prereq, `第 ${lesson.id} 关的前置 ${prereq} 不是更早的关`).toBeLessThan(lesson.id);
      }
    }
  });
});

describe("错误类型与补救", () => {
  it("手做选错的错误类型都在册", () => {
    for (const lesson of FLOW_LESSONS) {
      for (const kind of Object.values(lesson.mistakeKinds ?? {})) {
        expect(MISTAKE_KINDS, `第 ${lesson.id} 关用了没登记的错误类型 ${kind}`).toContain(kind);
      }
    }
  });

  it("手做错误类型指向的手做题号存在", () => {
    for (const lesson of FLOW_LESSONS) {
      for (const [hand, kind] of Object.entries(lesson.mistakeKinds ?? {})) {
        const index = Number(hand);
        expect(
          index,
          `第 ${lesson.id} 关把第 ${index} 题标成了 ${kind}，但手做只有 ${lesson.handChoices.length} 题`,
        ).toBeLessThan(lesson.handChoices.length);
      }
    }
  });

  it("每一类错误都有地方能补救，补救关号是关卡自己声明的", () => {
    for (const kind of MISTAKE_KINDS) {
      const drill = MISTAKE_DRILLS[kind];
      expect(drill, `错误类型 ${kind} 没有补救关卡`).not.toBeNull();
      const owner = FLOW_LESSONS.find((lesson) =>
        (lesson.fixes ?? []).some((fix) => fix.kind === kind),
      );
      expect(owner, `错误类型 ${kind} 没有关卡声明能补救它`).not.toBeNull();
      expect(drill!.levelId).toBe(owner!.id);
      expect(drill!.text).toContain(`第 ${drill!.levelId} 关`);
    }
  });

  it("手做选错时按关卡声明的对应关系记录错误", () => {
    for (const lesson of FLOW_LESSONS) {
      const kinds = Object.entries(lesson.mistakeKinds ?? {});
      if (kinds.length === 0) continue;
      const [hand, kind] = kinds[0]!;
      const index = Number(hand);
      const wrong = (lesson.handCorrect + 1) % lesson.handChoices.length;
      if (index !== wrong) continue;
      expect(classifyHand(lesson.id, wrong, lesson.handCorrect)).toEqual([kind]);
    }
  });

  it("选对不记错误", () => {
    const lesson = FLOW_LESSONS.find((item) => item.id === 8);
    if (!lesson) throw new Error("缺少第 8 关");
    expect(classifyHand(8, lesson.handCorrect, lesson.handCorrect)).toEqual([]);
    expect(classifyHand(8, null, lesson.handCorrect)).toEqual([]);
  });
});

describe("按关卡分流", () => {
  it("第 1 关走自己的流程，其余关卡走标准流程", () => {
    const first = lessonById(1);
    expect(first).not.toBeNull();
    expect(isStageLesson(first!)).toBe(false);
    expect(() => stageLesson(1)).toThrow();
    for (const lesson of FLOW_LESSONS) {
      expect(isStageLesson(lesson)).toBe(true);
      expect(stageLesson(lesson.id).id).toBe(lesson.id);
    }
  });

  it("取不存在的关卡直接报错，不悄悄降级", () => {
    expect(lessonById(999)).toBeNull();
    expect(() => anchorOf(999)).toThrow();
  });
});
