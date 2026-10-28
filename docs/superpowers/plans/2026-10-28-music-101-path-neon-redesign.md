# 学习路径页霓虹航道重设计 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把闯关首页路径图改成产品级克制的「霓虹航道」气质，并加入 16×16 像素吉祥物 Miko，同时保留「下一步只有一个答案」的路径语义。

**Architecture:** 状态与布局仍走纯函数 `path.ts` / `path-layout.ts`；视觉集中在 `path.css` + `theme.ts` token；Miko 是独立 UI 组件 + 手绘像素资源。不改进度 schema、不改掌握判定。

**Tech Stack:** React 19、TypeScript、Vitest、现有 Ant Design 壳、CSS 变量 token（`src/ui/theme.ts`）、`src/ui/path.css`

## Global Constraints

- 规格：`docs/superpowers/specs/2026-10-28-music-101-path-neon-redesign.md`
- 气质：产品级克制，不像 demo；一屏强发光 ≤ 下一关主按钮 + 当前节点（+ 当前段细连线）
- 动效：只动 `transform` / `opacity`；必须有 `prefers-reduced-motion` 降级
- Miko：16×16 粗像素，整数倍放大，`image-rendering: pixelated`；任意姿势最多两只前爪；Idle 禁止多手/鬼影肢；资源须手绘校对后入库
- 不改：`pathStates` 语义、progress schema、Lesson 内容、工具模式入口
- 文案中文；测试命令：`npm test`、`npm run typecheck`
- 分支：从当前 `feature/u0-u1-motion-session` 开 `feature/path-neon-redesign`（或同名），开 PR

## File Structure

| 文件 | 职责 |
|---|---|
| `src/core/lesson/path-layout.ts` | 下调 `NODE_AMPLITUDE`（及必要时 `NODE_GAP`） |
| `tests/lesson/path.test.ts` | 布局断言随幅度更新 |
| `src/ui/theme.ts` | 路径/霓虹相关 token（主强调、阶段辅色、弱发光） |
| `src/ui/path.css` | 路径页视觉重做（克制霓虹） |
| `src/ui/PathMap.tsx` | 结构微调：下一关卡挂 Miko；阶段 class 带 stage id |
| `src/ui/miko/Miko.tsx` | 像素猫组件（pose: idle \| point \| cheer） |
| `src/ui/miko/miko.css` | pixelated 放大与减动效 |
| `src/ui/miko/sprites/*.png` | 手绘 16×16 精灵（至少 idle、cheer） |
| `tests/ui/miko.test.ts` | 姿势枚举 / 减动效时不播帧动画 class |

---

### Task 1: 收窄蛇形幅度

**Files:**
- Modify: `src/core/lesson/path-layout.ts`
- Modify: `tests/lesson/path.test.ts`

**Interfaces:**
- Consumes: 现有 `layoutPath` / `NODE_*` 导出
- Produces: `NODE_AMPLITUDE` 新常量（目标区间 **100–120**，默认先取 `110`）；仍满足 `NODE_AMPLITUDE > NODE_WIDTH / 2` **或** 若无法同时满足，则同步下调 `NODE_WIDTH` 并更新所有依赖断言——**优先保「相邻节点横向错开可读、弧线不被盖死」**，以测试 + 截图为准

- [ ] **Step 1: 写/改失败测试（幅度更小仍可读）**

在 `tests/lesson/path.test.ts` 增加或调整：

```ts
it("幅度收窄后相邻节点仍有横向错开", () => {
  const stages = buildPath(emptyProgress());
  const tracks = layoutPath(stages);
  const nodes = tracks[0]!.nodes;
  expect(Math.abs(nodes[0]!.x - nodes[1]!.x)).toBeGreaterThan(40);
  expect(NODE_AMPLITUDE).toBeLessThanOrEqual(120);
  expect(NODE_AMPLITUDE).toBeGreaterThanOrEqual(100);
});
```

保留原有「不超出轨道」「连线是 M + C」等测试；若旧断言写死 `150`，改为读常量。

- [ ] **Step 2: 跑测试确认失败或旧值不符**

Run: `npm test -- tests/lesson/path.test.ts`
Expected: 与 `NODE_AMPLITUDE === 150` 相关的新断言 FAIL

- [ ] **Step 3: 改常量**

```ts
export const NODE_AMPLITUDE = 110;
```

若 `110 <= NODE_WIDTH/2`（200/2=100 → 110 仍 > 100），保持 `NODE_WIDTH = 200`。阶段乘数 `1 + stageIndex * 0.12` 可改为 `1 + stageIndex * 0.06`，避免第三阶段又甩开。

- [ ] **Step 4: 测试通过**

Run: `npm test -- tests/lesson/path.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/lesson/path-layout.ts tests/lesson/path.test.ts
git commit -m "feat(path): 收窄蛇形幅度，路径更好扫"
```

---

### Task 2: 路径 token（克制霓虹）

**Files:**
- Modify: `src/ui/theme.ts`
- Modify: `tests/ui/theme.test.ts`（若已有变量守卫；没有则补一条：新 CSS 变量必须在 token 定义）

**Interfaces:**
- Produces CSS vars via `tokenStylesheet()`，至少：
  - `--m101-path-accent`（主强调，默认青系）
  - `--m101-path-accent-glow`（极低透明发光）
  - `--m101-path-stage-foundation` / `--m101-path-stage-arrangement` / `--m101-path-stage-style`（阶段辅色，只染标签与连线）
  - `--m101-path-surface`（下一关卡表面）

- [ ] **Step 1: 失败测试——stylesheet 含新变量名**

```ts
it("注入路径霓虹相关 token", () => {
  const css = tokenStylesheet();
  expect(css).toContain("--m101-path-accent:");
  expect(css).toContain("--m101-path-accent-glow:");
  expect(css).toContain("--m101-path-stage-foundation:");
});
```

- [ ] **Step 2: 跑测见 FAIL**

Run: `npm test -- tests/ui/theme.test.ts`

- [ ] **Step 3: 在 `theme.ts` 增加 path 组并写入 `tokenStylesheet`**

用现有 `colorScales` / `palette` 组合，禁止新散落 hex 进 `path.css`（`path.css` 只引用 var）。

- [ ] **Step 4: 测试 PASS + `npm run typecheck`**

- [ ] **Step 5: Commit**

```bash
git add src/ui/theme.ts tests/ui/theme.test.ts
git commit -m "feat(ui): 路径页克制霓虹 token"
```

---

### Task 3: 手绘 Miko 精灵 + 组件

**Files:**
- Create: `src/ui/miko/sprites/miko-idle.png`（16×16）
- Create: `src/ui/miko/sprites/miko-cheer.png`（16×16）
- Create: `src/ui/miko/sprites/miko-point.png`（可选）
- Create: `src/ui/miko/Miko.tsx`
- Create: `src/ui/miko/miko.css`
- Create: `tests/ui/miko.test.ts`

**Interfaces:**
- Produces:

```ts
export type MikoPose = "idle" | "point" | "cheer";
export function Miko(props: { pose?: MikoPose; className?: string }): JSX.Element;
```

- Idle 必须双爪清晰、无第三肢；坐姿双爪并拢或头肩 bust 二选一（规格允许）
- 显示：`width/height: 64px`（4×），`image-rendering: pixelated`
- `prefers-reduced-motion: reduce` 时不加动画 class

- [ ] **Step 1: 写失败测试**

```ts
import { render } from "@testing-library/react";
import { Miko } from "../../src/ui/miko/Miko.tsx";

it("默认 idle，并可切换 cheer", () => {
  const { container, rerender } = render(<Miko />);
  expect(container.querySelector("img")?.getAttribute("alt")).toMatch(/Miko/i);
  rerender(<Miko pose="cheer" />);
  expect(container.querySelector("img")?.getAttribute("src")).toMatch(/cheer/);
});
```

（若项目测试 React 组件的惯用方式不同，跟随仓库现有 RTL/`happy-dom` 模式。）

- [ ] **Step 2: 跑测 FAIL**

- [ ] **Step 3: 手绘 PNG（可用编辑器或脚本写像素数组导出），实现 `Miko.tsx` + css**

禁止把未校对的 AI 生成图直接当正式精灵。可用临时占位色块 PNG **仅在本任务开发中**，合并前必须换成校对过的 16×16。

- [ ] **Step 4: 测试 PASS**

- [ ] **Step 5: Commit**

```bash
git add src/ui/miko tests/ui/miko.test.ts
git commit -m "feat(ui): 加入像素吉祥物 Miko"
```

---

### Task 4: PathMap 顶区挂 Miko + 阶段 class

**Files:**
- Modify: `src/ui/PathMap.tsx`
- Modify: `src/ui/path.css`

**Interfaces:**
- Consumes: `Miko`；现有 `buildPath` / `layoutPath`
- 下一关卡旁渲染 `<Miko pose="idle" />`；主按钮 `onClick` 时可选瞬时 `point`（state，200ms 内回 idle，减动效则跳过）
- 每个 `.path-stage` 增加 `data-stage={stage.id}` 或 `path-stage--{id}`，供阶段辅色

- [ ] **Step 1: 手工/组件测——PathMap 渲染含 Miko alt 文本**

若无 RTL 习惯，用较小的纯函数抽取：`nextCardPose(complete: boolean): MikoPose` 单测即可。

```ts
export function nextCardPose(args: { complete: boolean; pressing: boolean }): MikoPose {
  if (args.pressing) return "point";
  return "idle";
}
```

- [ ] **Step 2–4: 实现并测试 PASS**

- [ ] **Step 5: Commit**

```bash
git add src/ui/PathMap.tsx src/ui/path.css src/ui/miko
git commit -m "feat(path): 下一关卡旁挂上 Miko"
```

---

### Task 5: path.css 产品级克制重做

**Files:**
- Modify: `src/ui/path.css`
- Touch only as needed: `src/styles.css`（全局是否污染路径底；尽量只动 path.css）

**Requirements (checklist in PR):**
- `.path-next`：深色表面、细中性/单强调描边，去掉花哨多层光
- `.path-node.is-current`：柔光用 `--m101-path-accent-glow`，呼吸仍用 opacity
- 连线：1px，阶段色低饱和；禁止粗彩虹描边
- `@media (prefers-reduced-motion: reduce)`：停 `m101-breathe`、停 Miko 帧动画
- 禁止在 path.css 写死主色 hex（用 var；theme 测试守卫继续有效）

- [ ] **Step 1: 确认 theme 守卫仍过**

Run: `npm test -- tests/ui/theme.test.ts`

- [ ] **Step 2: 重写 path 视觉**

- [ ] **Step 3: `npm test` 全绿 + `npm run typecheck`**

- [ ] **Step 4: 浏览器截图验收**
  - 顶区下一关 + Miko
  - 三阶段航道、当前关柔光
  - 系统减动效开启时无呼吸

- [ ] **Step 5: Commit**

```bash
git add src/ui/path.css
git commit -m "feat(path): 路径页改成产品级克制霓虹"
```

---

### Task 6: 过关时 cheer（轻量）

**Files:**
- Modify: 过关盖章所在组件（查 `m101-stamp` / 过关成功 UI；常见于 `LessonFlow.tsx` 或 session 组件）
- Modify: 仅在过关成功瞬间挂 `<Miko pose="cheer" />` 或触发已有 portal；工具页不出现

- [ ] **Step 1: 定位过关 UI 文件并加最小接入**
- [ ] **Step 2: 减动效时只静态 cheer 帧、不弹跳**
- [ ] **Step 3: `npm test` + typecheck**
- [ ] **Step 4: Commit**

```bash
git commit -am "feat(ui): 过关时 Miko 庆祝一帧"
```

---

### Task 7: 验收与 PR

- [ ] **Step 1: `npm test` 全绿、`npm run typecheck` 通过**
- [ ] **Step 2: 对照规格 §8 成功标准自检**
- [ ] **Step 3: 开 PR（中文说明），附截图：克制主页、Miko idle、减动效对比**
- [ ] **Step 4: 更新规格状态行为「已批准并实现中/已实现」若适用**

---

## Spec coverage (self-review)

| 规格项 | 任务 |
|---|---|
| 霓虹航道 + 收窄幅度 | Task 1, 5 |
| 下一关大卡焦点 | Task 4, 5 |
| 四态语义不变 | 不改 path.ts（回归 Task 1 测试） |
| 阶段辅色克制 | Task 2, 5 |
| Miko 16×16、位置、双爪 | Task 3, 4, 6 |
| 减动效 | Task 3, 5, 6 |
| 不改工具模式 / schema | 全任务边界 |

## Placeholder scan

无 TBD；幅度默认 110，可在 Task 1 截图后微调用同一测试带约束。
