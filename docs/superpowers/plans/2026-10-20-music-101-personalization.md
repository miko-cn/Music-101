# 定制化（规格 3.4）实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 把错误画像、关卡推荐、配方库、能力雷达和难度提示放进 localStorage，坏数据不把界面打崩。

**架构：** `progress.ts` 只负责 schema 2 的读写和从 schema 1 迁移。`personalize.ts` 是纯函数：错误分类、推荐、配方、雷达分数、难度提示。界面在现有深色 Ant Design 壳里加「进度」页，并在关卡顶部放提示。关卡选择永远不锁定。

**技术栈：** TypeScript、React、Ant Design、Vitest。不新增依赖，雷达用 SVG。

## 全局约束

- 进度键仍是 `music-101.progress`。当前版本号是 `2`。schema 高于 2、JSON 坏掉、形状不对，都回到空进度。
- schema 1 只迁移 `level1Passed`。为真时第 1 关记入已掌握。
- 文案中文。不改电脑键。不做 Cubase、账号、后端。
- 关卡 1–24 都能直接打开。已掌握只提示可跳过；没过只提示可重开。

## 文件

- 修改：`src/core/lesson/progress.ts`，schema 2 的存储。
- 新建：`src/core/lesson/personalize.ts`，画像、推荐、配方、雷达、难度。
- 新建：`src/ui/ProgressBoard.tsx`，`src/ui/LessonCoach.tsx`。
- 修改：`src/App.tsx`、`src/ui/LessonFlow.tsx`、`src/ui/LessonOne.tsx`、`src/styles.css`。
- 测试：`tests/lesson/progress.test.ts`、`tests/lesson/personalize.test.ts`。

## 数据

```ts
type MistakeKind = "same-progression" | "chorus-flat" | "low-end-clash";

interface Attempt {
  visitId: string;
  levelId: number;
  passed: boolean;
  easy: boolean;
  stuck: boolean;
  mistakes: MistakeKind[];
}

interface Recipe {
  id: string;
  levelId: number;
  title: string;
  summary: string;
  hand: number | null;
  drums: boolean[][] | null;
  referencePick: { bpm: number | null; key: number | null; structure: number | null } | null;
  pitch: number | null;
  steps: boolean[] | null;
}
```

能力维度：和声 1–8 与 14；节奏 10、21；配器 9、11、12、15、16、18–20；结构 13、17、22–24。分数是该维度已掌握关卡数除以关卡数。

错误只在选错时记：第 8 关选项 1 是同一条大调进行；第 11 关选项 1 是 808 抢 kick；第 13、22、23 关选项 1 是副歌不抬层。同一类出现至少 2 次，并且当前关卡号大于针对练习的关卡号时，插入提示。

轻松过关：过了、没用修正、听辨全对。卡住：没过，或用了修正。最近 3 次都轻松 → 变难提示。最近 2 次都卡住 → 复习上一关的提示。同一次进入用 `visitId` 覆盖，不重复计数。

## 任务

- [x] schema 2 读写、schema 1 迁移、坏数据归空。第 1 关不再用 schema 1 把整份进度覆盖掉。
- [x] 错误分类、次数、针对练习、掌握/重开、永远不锁、配方增删、雷达分数、难度提示，都有单测。
- [x] 「进度」页画出雷达、错误次数、可跳过/可重开、配方列表。关卡页能存配方、套用配方，并显示提示。
- [x] `npm test` 与 `npm run typecheck` 通过。
