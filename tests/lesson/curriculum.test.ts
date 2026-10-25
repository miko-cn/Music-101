import { describe, expect, it } from "vitest";
import { FLOW_LESSONS, LESSONS, anchorOf } from "../../src/content/index.ts";
import { LEVEL1_ANCHOR, LEVEL1_CONCEPT } from "../../src/content/lessons/level-01.ts";

const ALL_LESSONS = FLOW_LESSONS;

/** 全部记忆锚，从关卡自己身上收上来。 */
const ANCHORS = Object.fromEntries(LESSONS.map((lesson) => [lesson.id, lesson.anchor]));

describe("课程内容完整性", () => {
  it("27 关全部配了记忆锚，且锚点没有重复", () => {
    const ids = Object.keys(ANCHORS).map(Number).sort((a, b) => a - b);
    expect(ids).toEqual(Array.from({ length: 27 }, (_, index) => index + 1));
    const anchorIds = Object.values(ANCHORS).map((anchor) => anchor.id);
    expect(new Set(anchorIds).size).toBe(anchorIds.length);
  });

  it("每个记忆锚都有口诀、判定流程和至少三条 takeaway", () => {
    for (const [levelId, anchor] of Object.entries(ANCHORS)) {
      const where = `第 ${levelId} 关（${anchor.name}）`;
      expect(anchor.hook.length, `${where} 缺口诀`).toBeGreaterThan(4);
      expect(anchor.steps.length, `${where} 判定流程不足 3 步`).toBeGreaterThanOrEqual(3);
      expect(anchor.takeaway.length, `${where} takeaway 不足 3 条`).toBeGreaterThanOrEqual(3);
      for (const step of anchor.steps) expect(step.length).toBeGreaterThan(4);
      for (const point of anchor.takeaway) expect(point.length).toBeGreaterThan(6);
    }
  });

  it("每关的概念讲解至少 3 段", () => {
    for (const lesson of ALL_LESSONS) {
      expect(lesson.concept.length, `第 ${lesson.id} 关内容太少`).toBeGreaterThanOrEqual(3);
      for (const paragraph of lesson.concept) expect(paragraph.length).toBeGreaterThan(10);
    }
    expect(LEVEL1_CONCEPT.length).toBeGreaterThanOrEqual(4);
  });

  it("听辨题的选项至少 3 个，正确项下标合法，题目不重复", () => {
    for (const lesson of ALL_LESSONS) {
      const seen = new Set<string>();
      for (const question of lesson.ear) {
        expect(question.choices.length, `第 ${lesson.id} 关「${question.id}」选项太少`).toBeGreaterThanOrEqual(3);
        expect(question.correct, `第 ${lesson.id} 关「${question.id}」正确项越界`).toBeGreaterThanOrEqual(0);
        expect(question.correct, `第 ${lesson.id} 关「${question.id}」正确项越界`).toBeLessThan(
          question.choices.length,
        );
        expect(question.explain.length).toBeGreaterThan(6);
        expect(seen.has(question.id), `第 ${lesson.id} 关题目 id 重复：${question.id}`).toBe(false);
        seen.add(question.id);
      }
    }
  });

  it("过关阈值合理：既不能满分为过，也不能宽松到全靠蒙", () => {
    for (const lesson of ALL_LESSONS) {
      const ratio = lesson.earPass / lesson.ear.length;
      expect(ratio, `第 ${lesson.id} 关阈值太松`).toBeGreaterThanOrEqual(0.6);
      expect(ratio, `第 ${lesson.id} 关阈值太严`).toBeLessThan(1);
    }
  });

  it("复习钩子指向更早、且确实存在的关卡", () => {
    const known = new Set(ALL_LESSONS.map((lesson) => lesson.id));
    known.add(1);
    for (const lesson of ALL_LESSONS) {
      for (const prereq of lesson.prereq ?? []) {
        expect(known.has(prereq), `第 ${lesson.id} 关的前置 ${prereq} 不存在`).toBe(true);
        expect(prereq, `第 ${lesson.id} 关的前置 ${prereq} 不是更早的关`).toBeLessThan(lesson.id);
      }
    }
  });

  it("关卡自带的记忆锚与锚点库一致", () => {
    for (const lesson of ALL_LESSONS) {
      expect(lesson.anchor.id).toBe(anchorOf(lesson.id).id);
    }
    expect(LEVEL1_ANCHOR.id).toBe(anchorOf(1).id);
  });

  it("正确项不在每题都排第一，避免形成答题位置习惯", () => {
    const firstPositions = ALL_LESSONS.flatMap((lesson) =>
      lesson.ear.map((question) => question.correct),
    );
    const firstRatio = firstPositions.filter((index) => index === 0).length / firstPositions.length;
    expect(firstRatio, "正确项过度集中在第一个选项").toBeLessThan(0.6);
  });
});
