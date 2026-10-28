# 学习路径页课程大纲 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal：** 把闯关首页从蛇形航道改成课程大纲：顶卡继续学，三个阶段手风琴，关卡是可点的行。

**Architecture：** 判定仍用 `buildPath` / `pathProgress` / `pathComplete`。新的纯函数只负责「哪一段默认展开、阶段进度怎么数、行错峰延迟多少」。`PathMap` 继续是 App 的入口组件，内部改成目录，不再调用 `layoutPath`。样式整份换掉 `path.css`。开合状态放在组件的 `useState` 里，卸载即丢，不进 localStorage。

**Tech Stack：** React 19、TypeScript、Vitest（`node` 环境，没有组件测试库）、现有 Ant Design 壳、`tokenStylesheet()`、`prefers-reduced-motion`。

## Global Constraints

- 不改 `pathStates`、`pathProgress`、`pathComplete`、`buildPath` 的判定。当前关是第一个没掌握的关；全部掌握时当前关是最后一关。
- 一行摘要只用现有 `hook`。不新开文案字段，不改关卡内容。
- 进度文案是 `{done} / {total}`，没有百分号。
- 不锁关。顶栏闯关文案保持：路径页「学习路径」，关卡页「返回路径」。
- 顶卡主按钮只有「开始这一关」和「再看一遍」。不把「返回路径」放到顶卡上。
- 不做 Miko，不留吉祥物空位，不把庆祝动画搬到目录。
- 不做蛇形、SVG 折线、`layoutPath`、`--m101-path-*` 霓虹色。
- 动效时长只用 `--m101-dur-fast`（140ms）、`--m101-dur-base`（220ms）、`--m101-ease-out`。不用回弹弹簧。
- 手风琴面板是这一页唯一允许的高度过渡（`grid-template-rows`）。其余只动 `transform` 和 `opacity`。
- `prefers-reduced-motion: reduce` 时无位移、无错峰、开合瞬时。
- 相对导入带 `.ts` / `.tsx` 后缀。`import type` 与值导入分开。
- 验证命令：`npm test`、`npm run typecheck`。

---

## 文件结构

| 文件 | 职责 |
|---|---|
| `src/core/lesson/path.ts` | 新增目录纯函数。不改已有判定函数。 |
| `tests/lesson/path.test.ts` | 留下状态、进度、分组测试。任务 1 加目录函数测试。任务 3 删掉 `describe("路径布局")`。 |
| `src/ui/PathMap.tsx` | 顶卡 + 三阶段手风琴 + 关卡行。props 不变。 |
| `src/ui/path.css` | 大纲样式和 §5 动效。删掉蛇形、折线、呼吸光晕。 |
| `src/core/lesson/path-layout.ts` | 任务 3 删除。唯一调用方是 `PathMap` 和布局测试。 |
| `src/ui/theme.ts` | 任务 4 删除六个 `--m101-path-*` 键。 |
| `tests/ui/theme.test.ts` | 任务 3 换掉「当前关呼吸」断言。任务 4 改为断言霓虹 token 不存在。 |
| `tests/ui/path-syllabus.test.ts` | 任务 3 创建。锁住 `path.css` 的类、动效和减动效。 |
| `tests/ui/syllabus-nav.test.ts` | 任务 5 创建。锁住 `App.tsx` 的接线，不改导航。 |
| `src/App.tsx` | 不改。仍渲染 `<PathMap progress={progress} onOpenLevel={openLevel} />`。 |

Vitest 跑在 Node 里，不能渲染组件。开合、点击进关、减动效观感放在任务 6 的手工清单。能单测的规则全部放进纯函数和 CSS 文本断言。

---

### Task 1: 目录纯函数

**Files:**
- Modify: `src/core/lesson/path.ts`
- Test: `tests/lesson/path.test.ts`

**Interfaces:**
- Consumes: `buildPath`、`PathStage`、`PathNode`、`emptyProgress`
- Produces:

```ts
export function currentPathNode(stages: readonly PathStage[]): PathNode | null;
export function stageMastery(stage: PathStage): { done: number; total: number };
export function initialOpenStageIds(stages: readonly PathStage[]): string[];
export function continueLabels(complete: boolean): { kicker: string; action: string };
export function rowDelayMs(index: number): number;
```

- [ ] **Step 1: 写失败测试**

在 `tests/lesson/path.test.ts` 的 import 里加上这五个函数，并在文件末尾追加：

```ts
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
```

`withMastered` 已经在这个测试文件里。

- [ ] **Step 2: 跑测试确认失败**

Run: `npm test -- tests/lesson/path.test.ts -t "课程大纲"`

Expected: FAIL，`currentPathNode` 等没有从 `path.ts` 导出。

- [ ] **Step 3: 把函数加到 `src/core/lesson/path.ts` 末尾**

不要修改 `pathStates`、`buildPath`、`pathProgress`、`pathComplete`。

```ts
/** 目录顶卡用的那一关。没有阶段时是 null。 */
export function currentPathNode(stages: readonly PathStage[]): PathNode | null {
  for (const stage of stages) {
    const found = stage.nodes.find((node) => node.state === "current");
    if (found) return found;
  }
  return null;
}

/** 阶段头上的「已掌握 / 关数」。没掌握也保留分母。 */
export function stageMastery(stage: PathStage): { done: number; total: number } {
  return {
    done: stage.nodes.filter((node) => node.state === "mastered").length,
    total: stage.nodes.length,
  };
}

/** 进入路径页时只打开含当前关的阶段。空列表表示没有可打开的段。 */
export function initialOpenStageIds(stages: readonly PathStage[]): string[] {
  const current = currentPathNode(stages);
  return current ? [current.stage] : [];
}

/** 顶卡的两句文案。返回路径不属于顶卡。 */
export function continueLabels(complete: boolean): { kicker: string; action: string } {
  if (complete) return { kicker: "全部掌握", action: "再看一遍" };
  return { kicker: "接下来", action: "开始这一关" };
}

/** 展开时第 index 行的延迟。20ms 一档，200ms 封顶。 */
export function rowDelayMs(index: number): number {
  return Math.min(Math.max(0, index) * 20, 200);
}
```

- [ ] **Step 4: 测试通过**

Run: `npm test -- tests/lesson/path.test.ts`

Expected: PASS。原有状态、进度、布局测试仍在。

- [ ] **Step 5: Commit**

```bash
git add src/core/lesson/path.ts tests/lesson/path.test.ts
git commit -m "test(path): 为课程大纲补上展开、进度和错峰规则"
```

---

### Task 2: 把 PathMap 换成目录

**Files:**
- Modify: `src/ui/PathMap.tsx`（整文件替换）

**Interfaces:**
- Consumes: Task 1 的五个函数；`buildPath`、`pathComplete`、`pathProgress`；`levelTitleTransitionName`；`ProgressFile`
- Produces: `export function PathMap({ progress, onOpenLevel }: { progress: ProgressFile; onOpenLevel: (levelId: number) => void }): JSX.Element`
- 不调用 `layoutPath`。不 `scrollIntoView`。开合只存在于这次挂载的 `useState`。

这一步之后页面还穿着旧 `path.css`，看起来会散。样式在任务 3 整份换掉。本步的完成线是 `npm run typecheck` 通过，且 `npm test` 仍通过。

- [ ] **Step 1: 用下面的文件替换 `src/ui/PathMap.tsx`**

```tsx
/**
 * 闯关首页是课程目录，不是地图。
 *
 * 顶卡回答「接下来做什么」。三个阶段是手风琴。
 * 开合放在这次挂载的 state 里：离开页面组件卸载，再回来恢复默认展开。
 */
import { useState, ViewTransition } from "react";
import {
  buildPath,
  continueLabels,
  currentPathNode,
  initialOpenStageIds,
  pathComplete,
  pathProgress,
  rowDelayMs,
  stageMastery,
  type PathNode,
  type PathStage,
} from "../core/lesson/path.ts";
import type { ProgressFile } from "../core/lesson/progress.ts";
import { levelTitleTransitionName } from "./LessonHeader.tsx";

export function PathMap({
  progress,
  onOpenLevel,
}: {
  progress: ProgressFile;
  onOpenLevel: (levelId: number) => void;
}) {
  const stages = buildPath(progress).filter((stage) => stage.nodes.length > 0);
  const current = currentPathNode(stages);
  const { done, total } = pathProgress(progress);
  const labels = continueLabels(pathComplete(progress));
  const [openIds, setOpenIds] = useState<ReadonlySet<string>>(() => new Set(initialOpenStageIds(stages)));
  const [pulse, setPulse] = useState<Record<string, number>>({});

  const toggle = (id: string) => {
    const willOpen = !openIds.has(id);
    setOpenIds((currentIds) => {
      const next = new Set(currentIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    if (willOpen) {
      setPulse((currentPulse) => ({ ...currentPulse, [id]: (currentPulse[id] ?? 0) + 1 }));
    }
  };

  return (
    <div className="path-syllabus">
      {current ? (
        <section className="path-next">
          <div className="path-next-copy">
            <span className="path-next-kicker">{labels.kicker}</span>
            <h2 className="path-next-title">
              第 {current.id} 关 · {current.title}
            </h2>
            <p className="path-next-hook">{current.hook}</p>
          </div>
          <div className="path-next-side">
            <p className="path-next-progress">
              <span className="sr-only">已掌握 </span>
              {done} / {total}
            </p>
            <button type="button" className="path-next-go m101-press" onClick={() => onOpenLevel(current.id)}>
              {labels.action}
            </button>
          </div>
        </section>
      ) : null}
      <div className="path-stages">
        {stages.map((stage, stageIndex) => (
          <StageBlock
            key={stage.id}
            stage={stage}
            index={stageIndex}
            open={openIds.has(stage.id)}
            pulse={pulse[stage.id] ?? 0}
            onToggle={() => toggle(stage.id)}
            onOpenLevel={onOpenLevel}
          />
        ))}
      </div>
    </div>
  );
}

function StageBlock({
  stage,
  index,
  open,
  pulse,
  onToggle,
  onOpenLevel,
}: {
  stage: PathStage;
  index: number;
  open: boolean;
  pulse: number;
  onToggle: () => void;
  onOpenLevel: (levelId: number) => void;
}) {
  const mastery = stageMastery(stage);
  const panelId = `path-stage-${stage.id}`;
  return (
    <section className={open ? "path-stage is-open" : "path-stage"}>
      <h3 className="path-stage-heading">
        <button
          type="button"
          className="path-stage-toggle"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
        >
          <span className="path-stage-index">{String(index + 1).padStart(2, "0")}</span>
          <span className="path-stage-name">{stage.title}</span>
          <span className="path-stage-count">
            {mastery.done} / {mastery.total}
          </span>
          <span className="path-stage-chevron" aria-hidden="true">
            ▸
          </span>
        </button>
      </h3>
      <div id={panelId} className="path-stage-panel" role="region">
        <div className="path-stage-panel-inner" inert={open ? undefined : true}>
          <ul className="path-rows">
            {stage.nodes.map((node, rowIndex) => (
              <li key={`${node.id}-${pulse}`}>
                <LevelRow node={node} index={rowIndex} onOpenLevel={onOpenLevel} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function LevelRow({
  node,
  index,
  onOpenLevel,
}: {
  node: PathNode;
  index: number;
  onOpenLevel: (levelId: number) => void;
}) {
  const stateName =
    node.state === "current" ? "下一步" : node.state === "mastered" ? "已掌握" : node.state === "retry" ? "上次没过" : "";
  return (
    <button
      type="button"
      className={`path-row is-${node.state}`}
      style={{ animationDelay: `${rowDelayMs(index)}ms` }}
      onClick={() => onOpenLevel(node.id)}
      aria-current={node.state === "current" ? "step" : undefined}
      aria-label={stateName ? `第 ${node.id} 关 ${node.title}，${stateName}` : `第 ${node.id} 关 ${node.title}`}
    >
      <span className="path-row-copy">
        <ViewTransition name={levelTitleTransitionName(node.id)}>
          <span className="path-row-title">
            第 {node.id} 关 · {node.title}
          </span>
        </ViewTransition>
        <span className="path-row-hook">{node.hook}</span>
      </span>
      {node.state === "mastered" ? (
        <span className="path-row-mark" aria-hidden="true">
          ✓
        </span>
      ) : null}
      {node.state === "retry" ? <span className="path-row-dot" aria-hidden="true" /> : null}
    </button>
  );
}
```

- [ ] **Step 2: 类型检查**

Run: `npm run typecheck`

Expected: PASS。若 `inert` 的类型不接受 `undefined`，改成 `inert={!open}`。

- [ ] **Step 3: 全量测试仍通过**

Run: `npm test`

Expected: PASS。布局测试还在，因为 `path-layout.ts` 还没删。

- [ ] **Step 4: Commit**

```bash
git add src/ui/PathMap.tsx
git commit -m "feat(path): 路径页改为继续学卡片和阶段目录"
```

---

### Task 3: 大纲样式，并删除蛇形布局

**Files:**
- Create: `tests/ui/path-syllabus.test.ts`
- Modify: `src/ui/path.css`（整文件替换）
- Modify: `tests/lesson/path.test.ts`（删除布局 describe 和只为它服务的 import）
- Modify: `tests/ui/theme.test.ts`（换掉呼吸断言）
- Delete: `src/core/lesson/path-layout.ts`

**Interfaces:**
- Consumes: Task 2 的 class 名：`path-syllabus`、`path-next`、`path-next-go`、`path-stage`、`path-stage-panel`、`path-stage-chevron`、`path-row`、`path-row-dot`
- 不新增 token。主按钮用已有 `--m101-brand` 和 `m101-press`。

- [ ] **Step 1: 写会失败的样式合同**

创建 `tests/ui/path-syllabus.test.ts`：

```ts
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = resolve(fileURLToPath(new URL("../../", import.meta.url)));

describe("课程大纲样式", () => {
  const css = readFileSync(join(ROOT, "src", "ui", "path.css"), "utf8");

  it("不再是蛇形航道", () => {
    expect(css).not.toContain("path-track");
    expect(css).not.toContain("m101-breathe");
    expect(css).not.toContain("--m101-path-");
    expect(css).not.toContain("<svg");
  });

  it("顶卡、折叠和行都有短动效", () => {
    expect(css).toContain("path-card-in");
    expect(css).toContain("translateY(6px)");
    expect(css).toContain("grid-template-rows: 0fr");
    expect(css).toContain("grid-template-rows: 1fr");
    expect(css).toContain("var(--m101-dur-base)");
    expect(css).toContain("var(--m101-ease-out)");
    expect(css).toContain("path-row-in");
    expect(css).toContain("translateY(4px)");
    expect(css).toContain("var(--m101-veil)");
    expect(css).toContain("translateY(1px)");
    expect(css).toContain("var(--m101-brand)");
  });

  it("减动效时关掉位移、错峰和折叠过渡", () => {
    const start = css.indexOf("@media (prefers-reduced-motion: reduce)");
    expect(start).toBeGreaterThanOrEqual(0);
    const reduced = css.slice(start);
    expect(reduced).toContain("animation: none");
    expect(reduced).toContain("transition: none");
    expect(reduced).toContain(".path-stage-panel");
    expect(reduced).toContain(".path-row");
    expect(reduced).toContain("transform: none");
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npm test -- tests/ui/path-syllabus.test.ts`

Expected: FAIL。现行 `path.css` 仍含 `path-track` 和 `--m101-path-`。

- [ ] **Step 3: 替换 `src/ui/path.css`**

```css
/*
 * 课程大纲。顶卡是重音，下面是三段目录。
 * 没有折线，没有航道光晕。
 */

@keyframes path-card-in {
  from {
    opacity: 0.65;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes path-row-in {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.path-syllabus {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: min(40rem, 100%);
  margin: 0 auto;
  padding: 0.25rem 0 2rem;
}

.path-next {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1.5rem;
  padding: 1.15rem 1.35rem 1.25rem;
  border: 1px solid var(--m101-line);
  border-radius: var(--m101-radius-lg);
  background: var(--m101-surface);
  animation: path-card-in var(--m101-dur-base) var(--m101-ease-out);
}

.path-next-kicker {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  color: var(--m101-text-dim);
}

.path-next-title {
  margin: 0.28rem 0 0;
  font-size: 1.65rem;
  line-height: 1.25;
}

.path-next-hook {
  margin: 0.4rem 0 0;
  max-width: 36rem;
  color: var(--m101-text-dim);
  line-height: 1.5;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.path-next-side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.75rem;
}

.path-next-progress {
  margin: 0;
  color: var(--m101-text-dim);
  font-variant-numeric: tabular-nums;
}

.path-next-go {
  appearance: none;
  cursor: pointer;
  border: 0;
  border-radius: var(--m101-radius-md);
  padding: 0.68rem 1.1rem;
  font: inherit;
  font-weight: 700;
  color: var(--m101-bg);
  background: var(--m101-brand);
}

.path-stages {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.path-stage {
  border: 1px solid var(--m101-line);
  border-radius: var(--m101-radius-lg);
  background: var(--m101-surface);
}

.path-stage-heading {
  margin: 0;
}

.path-stage-toggle {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.85rem 1rem;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.path-stage-index {
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.12em;
  color: var(--m101-text-faint);
}

.path-stage-name {
  font-weight: 600;
}

.path-stage-count {
  margin-left: auto;
  color: var(--m101-text-dim);
  font-variant-numeric: tabular-nums;
}

.path-stage-chevron {
  display: inline-block;
  transition: transform var(--m101-dur-base) var(--m101-ease-out);
}

.path-stage.is-open .path-stage-chevron {
  transform: rotate(90deg);
}

.path-stage-panel {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows var(--m101-dur-base) var(--m101-ease-out);
}

.path-stage.is-open .path-stage-panel {
  grid-template-rows: 1fr;
}

.path-stage-panel-inner {
  overflow: hidden;
}

.path-rows {
  list-style: none;
  margin: 0;
  padding: 0 0.75rem 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.path-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.7rem 0.85rem;
  border: 0;
  border-radius: var(--m101-radius-md);
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  animation: path-row-in var(--m101-dur-fast) var(--m101-ease-out) backwards;
  transition:
    background-color var(--m101-dur-fast) var(--m101-ease-out),
    transform var(--m101-dur-fast) var(--m101-ease-out);
}

.path-row:hover {
  background: var(--m101-veil);
}

.path-row:active {
  transform: translateY(1px);
}

.path-row.is-current {
  box-shadow: inset 3px 0 0 var(--m101-brand);
}

.path-row-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.path-row-title {
  font-weight: 600;
}

.path-row-hook {
  color: var(--m101-text-faint);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.path-row-mark {
  margin-left: auto;
  color: var(--m101-success);
  font-weight: 700;
}

.path-row-dot {
  margin-left: auto;
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--m101-danger);
  opacity: 0.7;
}

@media (max-width: 720px) {
  .path-next {
    flex-direction: column;
    align-items: flex-start;
  }

  .path-next-side {
    align-items: flex-start;
  }
}

@media (prefers-reduced-motion: reduce) {
  .path-next,
  .path-row,
  .path-stage-chevron,
  .path-stage-panel {
    animation: none;
    transition: none;
    transform: none;
  }

  .path-next-go:active,
  .path-row:active {
    transform: none;
  }
}
```

`backwards` 只覆盖延迟期间的起点。动画结束后 transform 交还给 `:active`，按下的 1px 才不会被填充模式吃掉。

- [ ] **Step 4: 删掉蛇形模块和旧断言**

删除 `src/core/lesson/path-layout.ts`。

在 `tests/lesson/path.test.ts` 删除 `describe("路径布局"` 整段，以及只被它使用的 import：`readFileSync`、`join`、`resolve`、`fileURLToPath`、`NODE_AMPLITUDE`、`NODE_HEIGHT`、`NODE_WIDTH`、`layoutPath`、`layoutStage`，还有 `ROOT`。保留 `withMastered` 和任务 1 的「课程大纲」describe。

在 `tests/ui/theme.test.ts` 把 `it("路径图减动效时当前关不呼吸，而且不写死主色"` 整段换成：

```ts
  it("大纲样式不写死主色", () => {
    const css = readFileSync(join(ROOT, "src", "ui", "path.css"), "utf8");
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(css).not.toContain("--m101-path-");
  });
```

`it("注入路径霓虹相关 token"` 先留着。token 本身在任务 4 删除。

- [ ] **Step 5: 测试通过**

Run: `npm test`

Expected: PASS。`tests/ui/path-syllabus.test.ts` 通过。仓库里不再 import `path-layout.ts`。

Run: `npm run typecheck`

Expected: PASS。

- [ ] **Step 6: Commit**

```bash
git add src/ui/path.css tests/ui/path-syllabus.test.ts tests/lesson/path.test.ts tests/ui/theme.test.ts
git add -u src/core/lesson/path-layout.ts
git commit -m "feat(path): 大纲样式替换蛇形航道"
```

---

### Task 4: 删掉没用的路径霓虹 token

**Files:**
- Modify: `src/ui/theme.ts`
- Modify: `tests/ui/theme.test.ts`

**Interfaces:**
- Consumes: 任务 3 之后没有任何文件引用 `--m101-path-accent`、`--m101-path-accent-glow`、`--m101-path-stage-foundation`、`--m101-path-stage-arrangement`、`--m101-path-stage-style`、`--m101-path-surface`
- Produces: `tokenStylesheet()` 不再包含这六个变量

- [ ] **Step 1: 把霓虹断言改成「必须不存在」**

把 `tests/ui/theme.test.ts` 里的 `it("注入路径霓虹相关 token"` 整段换成：

```ts
  it("路径霓虹 token 已经移除", () => {
    const css = tokenStylesheet();
    for (const name of [
      "--m101-path-accent:",
      "--m101-path-accent-glow:",
      "--m101-path-stage-foundation:",
      "--m101-path-stage-arrangement:",
      "--m101-path-stage-style:",
      "--m101-path-surface:",
    ]) {
      expect(css, name).not.toContain(name);
    }
  });
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npm test -- tests/ui/theme.test.ts -t "路径霓虹 token"`

Expected: FAIL。`tokenStylesheet()` 仍含 `--m101-path-accent:`。

- [ ] **Step 3: 从 `src/ui/theme.ts` 的 `extras` 删除这六键和它们上面的注释**

删除的键是 `path-accent`、`path-accent-glow`、`path-stage-foundation`、`path-stage-arrangement`、`path-stage-style`、`path-surface`。`press-neutral` 及之后的键留着。不要改 `palette`、`durations`、`easings`。

- [ ] **Step 4: 测试和类型检查通过**

Run: `npm test`

Expected: PASS。`token 都定义过` 那条不会去找已删除的变量，因为 `path.css` 已经不用它们。

Run: `npm run typecheck`

Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/ui/theme.ts tests/ui/theme.test.ts
git commit -m "refactor(ui): 移除大纲页不再使用的路径霓虹色"
```

---

### Task 5: 锁住双模式接线

**Files:**
- Create: `tests/ui/syllabus-nav.test.ts`
- Modify: 无。`src/App.tsx` 保持现状。

**Interfaces:**
- Consumes: `App.tsx` 现有字符串 `PathMap`、`progress={progress}`、`onOpenLevel={openLevel}`、`返回路径`、`学习路径`
- 若测试失败，只允许把首页渲染改回 `<PathMap progress={progress} onOpenLevel={openLevel} />`。不要改顶栏三元表达式，不要改工具模式按钮。

- [ ] **Step 1: 写接线测试**

```ts
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = resolve(fileURLToPath(new URL("../../", import.meta.url)));

describe("闯关导航", () => {
  const app = readFileSync(join(ROOT, "src", "App.tsx"), "utf8");

  it("首页仍把进度和进关回调交给 PathMap", () => {
    expect(app).toContain("<PathMap progress={progress} onOpenLevel={openLevel} />");
  });

  it("顶栏文案仍随所在页面切换", () => {
    expect(app).toContain('learnView === "lesson" ? "返回路径" : "学习路径"');
  });
});
```

- [ ] **Step 2: 跑测试**

Run: `npm test -- tests/ui/syllabus-nav.test.ts`

Expected: PASS。当前 `App.tsx` 已经满足。不要为了这个测试去改导航。

- [ ] **Step 3: Commit**

```bash
git add tests/ui/syllabus-nav.test.ts
git commit -m "test(path): 锁住大纲页和双模式导航的接线"
```

---

### Task 6: 全量验证

**Files:**
- 无新代码。对照规格 §7 在浏览器里走一遍。

- [ ] **Step 1: 自动检查**

Run: `npm test`

Expected: 进程退出码 0。

Run: `npm run typecheck`

Expected: 进程退出码 0。

Run: `rg -n "layoutPath|path-layout|m101-breathe|path-track|--m101-path-" src tests`

Expected: 无匹配。

- [ ] **Step 2: 浏览器清单**

`npm run dev`。用一份空的 localStorage 打开闯关首页。

- [ ] 顶卡是「接下来 / 第 1 关 · 音高与键盘 / 口诀 / 0 / 27 / 开始这一关」。没有吉祥物空位，没有折线。
- [ ] 阶段一展开，阶段二、三折叠。三行阶段头都能看到 `01`、`02`、`03` 和 `0 / 8`、`0 / 12`、`0 / 7`。
- [ ] 点阶段二的头，列表展开，行有很短的错峰。再点一次，列表收起。阶段一保持展开。
- [ ] 第 1 关行有左侧色条。其它没做过的行没有勾、没有点。
- [ ] 点第 3 关的行进入第 3 关。顶栏变成「返回路径」。点它回到目录，顶栏变回「学习路径」，阶段一重新默认展开。
- [ ] 主按钮「开始这一关」进入第 1 关。
- [ ] 顶卡进场有一次上移，不循环。行悬停有浅底，按下下移 1px。主按钮按下有底边。
- [ ] 打开系统「减少动态效果」后刷新：顶卡不动，阶段开合没有过程，行没有错峰，按下没有位移。按钮仍能进关。
- [ ] 工具模式的乐理、诊断、记忆点、复习、进度仍能从顶栏进入。

- [ ] **Step 3: 不在这一步提交功能代码**

若清单失败，回到对应任务修，修完再跑 Step 1。清单通过且工作区干净，计划即完成。

---

## 规格覆盖自检

| 规格 | 任务 |
|---|---|
| §2 语义不改、不锁关、不用百分比、不做 Miko | Task 1 不改判定函数；Task 2 每行都 `onOpenLevel`；Task 6 清单 |
| §3.1 顶卡文案、`done / total`、开始这一关 / 再看一遍 | `continueLabels`、`currentPathNode`、`pathProgress`、`pathComplete` |
| §3.2 三阶段、序号、进度、默认展开、单独开合、不记住 | `initialOpenStageIds`、`stageMastery`、`useState` 随卸载丢失 |
| §3.3 行文案、四态、整行可点、读屏 | `LevelRow` 的 class、勾、8px 点、`aria-current`、`aria-label` |
| §4 深色表面、品牌主按钮、无霓虹、窄屏纵向 | `path.css`；Task 4 删 token |
| §5 顶卡 6px、折叠 220ms、错峰 20ms 封顶 200ms、悬停、按下、减动效 | `rowDelayMs`、`path-card-in`、`path-row-in`、`grid-template-rows`、reduced 媒体查询 |
| §6 删 `path-layout`、留语义测试、App 仍传原 props | Task 3、Task 5 |
| §7 成功标准 | Task 6 |
| §8 霓虹视觉退役，Miko 仍不做 | Task 2–4，没有 `src/ui/miko` |

没有未定项。阶段关数 8 / 12 / 7 来自当前 `level-01` 到 `level-27` 的 `stage` 字段；测试按这个课程写死，课程再改关时这些断言会失败，那是内容变更而不是大纲规则变更。
