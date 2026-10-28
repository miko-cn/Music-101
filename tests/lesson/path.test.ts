import { describe, expect, it } from "vitest";
import { LESSONS } from "../../src/content/index.ts";
import {
  buildPath,
  continueLabels,
  currentPathNode,
  initialOpenStageIds,
  pathComplete,
  pathProgress,
  pathStates,
  rowDelayMs,
  stageMastery,
} from "../../src/core/lesson/path.ts";
import { emptyProgress, type ProgressFile } from "../../src/core/lesson/progress.ts";

/** 造一份进度：已掌握哪些关。 */
function withMastered(ids: number[]): ProgressFile {
  const progress = emptyProgress();
  return { ...progress, passedLevels: ids };
}

describe("路径节点状态", () => {
  it("全新用户：全部没做过，第一关是当前关", () => {
    const states = pathStates(emptyProgress());
    expect(states.get(1)).toBe("current");
    expect(states.get(2)).toBe("new");
    expect(states.get(27)).toBe("new");
  });

  it("当前关是第一个没掌握的关", () => {
    const states = pathStates(withMastered([1, 2, 3]));
    expect(states.get(1)).toBe("mastered");
    expect(states.get(3)).toBe("mastered");
    expect(states.get(4)).toBe("current");
  });

  it("中间有跳关：当前关是跳关之后第一个", () => {
    // 掌握 1、2、5：当前关应该是 3，不是 6。
    const states = pathStates(withMastered([1, 2, 5]));
    expect(states.get(3)).toBe("current");
    expect(states.get(4)).toBe("new");
    expect(states.get(6)).toBe("new");
  });

  it("全部掌握：最后一关是当前关（提示语另说）", () => {
    const all = LESSONS.map((lesson) => lesson.id);
    const states = pathStates(withMastered(all));
    expect(states.get(27)).toBe("current");
    expect(pathComplete(withMastered(all))).toBe(true);
  });

  it("还没掌握时不算完成", () => {
    expect(pathComplete(emptyProgress())).toBe(false);
    expect(pathComplete(withMastered([1, 2]))).toBe(false);
  });

  it("每个关都有且只有一个状态", () => {
    const states = pathStates(withMastered([1, 2, 3]));
    for (const lesson of LESSONS) {
      const state = states.get(lesson.id);
      expect(state, `第 ${lesson.id} 关没有状态`).toBeDefined();
      expect(["mastered", "retry", "new", "current"]).toContain(state);
    }
  });

  it("只有一个当前关", () => {
    const states = pathStates(withMastered([1, 2, 3]));
    const currents = [...states.values()].filter((state) => state === "current");
    expect(currents).toHaveLength(1);
  });
});

describe("路径进度", () => {
  it("用关数表示，不用百分比", () => {
    const progress = pathProgress(withMastered([1, 2, 3]));
    expect(progress.done).toBe(3);
    expect(progress.total).toBe(27);
  });
});

describe("路径结构", () => {
  it("按阶段分组，27 关一个不少", () => {
    const stages = buildPath(emptyProgress());
    const total = stages.reduce((sum, stage) => sum + stage.nodes.length, 0);
    expect(total).toBe(LESSONS.length);
  });

  it("每个节点都带标题和记忆锚口诀", () => {
    for (const stage of buildPath(emptyProgress())) {
      for (const node of stage.nodes) {
        expect(node.title.length, `第 ${node.id} 关没标题`).toBeGreaterThan(0);
        expect(node.hook.length, `第 ${node.id} 关没口诀`).toBeGreaterThan(0);
      }
    }
  });
});

describe("课程大纲", () => {
  it("默认只展开含当前关的那一段", () => {
    expect(initialOpenStageIds(buildPath(emptyProgress()))).toEqual(["foundation"]);
    const afterFoundation = Array.from({ length: 8 }, (_, index) => index + 1);
    expect(initialOpenStageIds(buildPath(withMastered(afterFoundation)))).toEqual(["arrangement"]);
    const allButLast = Array.from({ length: 26 }, (_, index) => index + 1);
    expect(initialOpenStageIds(buildPath(withMastered(allButLast)))).toEqual(["style"]);
  });

  it("阶段进度按已掌握节点计数，零也有分母", () => {
    const foundation = buildPath(withMastered([1, 2])).find((stage) => stage.id === "foundation");
    expect(foundation).toBeDefined();
    expect(stageMastery(foundation!)).toEqual({ done: 2, total: 8 });
    const style = buildPath(emptyProgress()).find((stage) => stage.id === "style");
    expect(stageMastery(style!)).toEqual({ done: 0, total: 7 });
  });

  it("顶卡文案只有两套，没有返回路径", () => {
    expect(continueLabels(false)).toEqual({ kicker: "接下来", action: "开始这一关" });
    expect(continueLabels(true)).toEqual({ kicker: "全部掌握", action: "再看一遍" });
  });

  it("当前关从阶段列表里找，找不到是 null", () => {
    const node = currentPathNode(buildPath(emptyProgress()));
    expect(node?.id).toBe(1);
    expect(node?.state).toBe("current");
    expect(currentPathNode([])).toBeNull();
  });

  it("行错峰是 20ms 一档，200ms 封顶", () => {
    expect(rowDelayMs(0)).toBe(0);
    expect(rowDelayMs(3)).toBe(60);
    expect(rowDelayMs(10)).toBe(200);
    expect(rowDelayMs(11)).toBe(200);
  });
});
