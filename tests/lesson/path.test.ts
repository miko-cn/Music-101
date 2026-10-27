import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { LESSONS } from "../../src/content/index.ts";
import {
  buildPath,
  pathComplete,
  pathProgress,
  pathStates,
} from "../../src/core/lesson/path.ts";
import {
  NODE_AMPLITUDE,
  NODE_HEIGHT,
  NODE_WIDTH,
  layoutPath,
  layoutStage,
} from "../../src/core/lesson/path-layout.ts";
import { emptyProgress, type ProgressFile } from "../../src/core/lesson/progress.ts";

const ROOT = resolve(fileURLToPath(new URL("../../", import.meta.url)));

/** 第一个节点相对中线的偏移。阶段起点应该在中线上。 */

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

describe("路径布局", () => {
  const stages = buildPath(emptyProgress());

  it("节点纵向排开，互不重叠", () => {
    const track = layoutStage(stages[0]!, 0);
    for (let index = 1; index < track.positions.length; index += 1) {
      const gap = track.positions[index]!.y - track.positions[index - 1]!.y;
      // 纵向间距要大于节点高度，否则会叠在一起。
      expect(gap).toBeGreaterThan(NODE_HEIGHT);
    }
  });

  it("节点横向摆动，但不是排成一条直线", () => {
    // 周期是 3 个节点，所以横向只有三个位置：中线、左、右。
    // 关键是要真的用上这三个位置，而不是排成一条直线。
    const track = layoutStage(stages[0]!, 0);
    const xs = track.positions.map((position) => position.x);
    expect(new Set(xs.map((x) => Math.round(x))).size).toBe(3);
  });

  it("阶段内部左右都摆得出去", () => {
    // 只往一边摆的话，整条路会挤在轨道的一侧。
    // 阶段的首尾不回中线没关系——阶段之间本来就断开。
    for (const track of layoutPath(stages)) {
      const xs = track.positions.map((position) => position.x);
      const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
      const offsets = xs.map((x) => x - centerX);
      expect(Math.min(...offsets), "没有往左摆").toBeLessThan(-50);
      expect(Math.max(...offsets), "没有往右摆").toBeGreaterThan(50);
    }
  });

  it("第一个节点从中线出发", () => {
    // 每个阶段的起点都在中线，三个阶段叠起来才连得上。
    for (const track of layoutPath(stages)) {
      const xs = track.positions.map((position) => position.x);
      const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
      expect(Math.abs(track.positions[0]!.x - centerX)).toBeLessThan(1);
    }
  });

  it("相邻节点明显错开，不是排成一条线", () => {
    // 摆幅不够或者周期太长，相邻节点会几乎重合成一列——
    // 那就不是路，是列表。
    const track = layoutStage(stages[0]!, 0);
    const offsets = track.positions.map((position) => position.x);
    for (let index = 1; index < offsets.length; index += 1) {
      const shift = Math.abs(offsets[index]! - offsets[index - 1]!);
      expect(shift, `第 ${index} 个节点跟前一个错开太少`).toBeGreaterThan(40);
    }
  });

  it("路左右交替地摆，不是单向拱", () => {
    // 单向拱读起来是「从上往下的一列」，交替摆才读得出是路。
    const track = layoutStage(stages[0]!, 0);
    const xs = track.positions.map((position) => position.x);
    let switches = 0;
    for (let index = 2; index < xs.length; index += 1) {
      const a = xs[index - 1]! - xs[index - 2]!;
      const b = xs[index]! - xs[index - 1]!;
      if (a * b < 0) switches += 1;
    }
    expect(switches).toBeGreaterThanOrEqual(1);
  });

  it("节点框不超出轨道宽度", () => {
    for (const track of layoutPath(stages)) {
      for (const position of track.positions) {
        expect(position.left).toBeGreaterThanOrEqual(0);
        expect(position.left + NODE_WIDTH).toBeLessThanOrEqual(track.width);
      }
    }
  });

  it("节点在轨道里居中，两侧留白相同", () => {
    // 内容偏一边的话，整张图看起来是歪的。
    for (const track of layoutPath(stages)) {
      const lefts = track.positions.map((position) => position.left);
      const rights = track.positions.map((position) => position.left + NODE_WIDTH);
      const leftGap = Math.min(...lefts);
      const rightGap = track.width - Math.max(...rights);
      expect(Math.abs(leftGap - rightGap)).toBeLessThan(1);
    }
  });

  it("节点框不超出轨道高度", () => {
    for (const track of layoutPath(stages)) {
      for (const position of track.positions) {
        expect(position.top).toBeGreaterThanOrEqual(0);
        expect(position.top + NODE_HEIGHT).toBeLessThanOrEqual(track.height);
      }
    }
  });

  it("摆幅大于节点宽度的一半，相邻节点才不糊成一片", () => {
    // 幅度不够的话，两个相邻节点横向重叠过半，
    // 连线几乎全被盖住，整张图退化成列表——那就白做了。
    expect(NODE_AMPLITUDE).toBeGreaterThan(NODE_WIDTH / 2);
  });

  it("CSS 里不再写死节点尺寸", () => {
    // 尺寸由 path-layout.ts 的常量注入 CSS。
    // 两份尺寸各写各的，漂移了节点就会盖住连线，而且很难看出来。
    const css = readFileSync(join(ROOT, "src", "ui", "path.css"), "utf8");
    expect(css).not.toMatch(/\.path-node\s*\{[^}]*width:\s*\d+px/);
    expect(css).not.toMatch(/\.path-node\s*\{[^}]*height:\s*\d+px/);
  });

  it("连线是连续的曲线", () => {
    const track = layoutStage(stages[0]!, 0);
    expect(track.path.startsWith("M ")).toBe(true);
    // 一条 M 起头，不是若干条子路径。
    expect(track.path.split("M ").length - 1).toBe(1);
    // 关数减一段：n 个节点 n-1 段曲线。
    const segments = track.path.split("C ").length - 1;
    expect(segments).toBe(track.positions.length - 1);
  });

  it("单个节点的阶段不画连线", () => {
    const single = { id: "foundation" as const, title: "x", nodes: [] };
    const track = layoutStage(single, 0);
    expect(track.path).toBe("");
    expect(track.height).toBe(0);
  });
});
