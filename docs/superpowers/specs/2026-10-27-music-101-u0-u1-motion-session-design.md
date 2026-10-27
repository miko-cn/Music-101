# Music-101 界面升级 U0 + U1：动效地基与答题会话

- 日期：2026-10-27
- 状态：待审
- 上游文档：`2026-10-27-music-101-product-design.md`（产品化规格，P0–P2 已完成）

---

## 1. 为什么要有这份文档

P0–P2 把反馈闭环、路径图、文案三字段都做完了，但界面仍然「朴素」。实际看下来，朴素来自三处：

| 现状 | 位置 |
|---|---|
| 听辨步把 8 道题一次全铺在一个长页面上，没有「当前这一题」的焦点 | `EarQuiz.tsx` 的 `items.map` |
| 点选项立刻判定，没有「选 → 检查 → 继续」的节奏 | `EarQuiz.choose` |
| 听辨选项直接写着 `C4 → C♯4`，不听也能答 | `QuizOption.tsx` 的 `quiz-option-label` |
| 手写关（2–8 关）56 道题里 54 道正确项排在第一个，关卡内不洗牌 | 内容 + `LessonFlow` |
| 动效只有 5 个作用在单个选项上的 keyframes；页面之间、题与题之间是硬切 | `motion.css` |
| 反馈音只有 3 个 cue，干声、无空间感，连对 20 题和第 1 题听起来一样 | `sfx.ts` / `engine.ts` |
| 没有音量和静音开关 | — |

这份文档只管**呈现层**：怎么动、怎么响、怎么一题一题地走。**不改评分口径**，也不修内容层的错（那批问题另开一份，见 §9）。

---

## 2. 技术选型（已定）

| 用途 | 选择 | 理由 |
|---|---|---|
| 组件级动效 | **Motion**（`motion` 包，`LazyMotion` + `m` + `domAnimation`） | 进场和退场（`AnimatePresence`）、弹簧、手势，跟 React state 天然绑定；MIT；按需加载约 6KB 起，`domAnimation` 约 +24KB |
| 页面级切换 | **React 19.3 `<ViewTransition>`** | 已安装的 `react@19.3.1` 稳定导出，0 体积；目标浏览器 Chrome/Edge 都支持 |
| 过关彩带 | **自写 canvas**（约 80 行） | 沿用「零依赖、自研」的路数；颜色走 token |
| 不用 | GSAP、Lottie、Rive、canvas-confetti | 两套动画系统并存会让时长规范分裂；Lottie/Rive 需要外部美术资产，跟「不做吉祥物」冲突 |

**不需要 `domMax`**：进度条用 `scaleX`、判定条用 `y`，都是 transform，`domAnimation` 够用。以后真要布局动画再升级。

---

## 3. 动效原则的修订

产品规格 §4.2 的「纯装饰的动效不做」**放宽一条**：

> 庆祝动效只允许出现在「完成」这类时刻：一轮听辨做完、连对达到里程碑、过关。
> 其余时间仍然只做「因果」和「引导」两类动效。

§4.1 的三条规矩不变：只动 `transform` / `opacity`；时长和缓动只从 token 取；每个动效都要有 reduced-motion 降级。

**reduced-motion 现在是两套开关**，必须都接上：

- CSS 动画和过渡：`motion.css` 末尾那条全局规则（已有）
- Motion 的 JS 动画：`<MotionConfig reducedMotion="user">`（新增）。它会关掉 transform 动画，只保留 opacity
- View Transition 的伪元素：`::view-transition-*` 不被 `*` 选中，要单独写降级（新增）
- 彩带：`matchMedia("(prefers-reduced-motion: reduce)")` 为真时不画

---

## 4. U0：地基

### 4.1 弹簧 token

`src/ui/theme.ts` 新增，跟现有 `durations` / `easings` 放在一起。名字不叫 `spring`：现有的 `easings.spring` 是 CSS 回弹曲线，不是物理弹簧。

```ts
export const springs = {
  /** 判定条、按钮按下：快、几乎不回弹。 */
  snappy: { type: "spring", stiffness: 520, damping: 32 },
  /** 题目切换、进度条：默认。 */
  base: { type: "spring", stiffness: 380, damping: 30 },
  /** 结算页、盖章：慢一点、有一点回弹。 */
  soft: { type: "spring", stiffness: 220, damping: 22 },
} as const;
```

组件里不许现编 `stiffness` / `damping`，只从 `springs` 取。

### 4.2 接入点

`src/main.tsx`：

```tsx
<StrictMode>
  <MotionConfig reducedMotion="user" transition={springs.base}>
    <LazyMotion features={domAnimation} strict>
      <App />
    </LazyMotion>
  </MotionConfig>
</StrictMode>
```

`strict` 保证没人误用全量的 `motion.div`（会把 `LazyMotion` 的体积优势废掉）。全站只用 `m.*`。

### 4.3 页面切换（View Transition）

**规则**：View Transition 只对包在 `startTransition` 里的更新生效。`App.tsx` 里每一个导航入口都要包——漏一个，那条路径就没有动画：

`openLevel`、`backToPath`、关卡下拉 `onChange`、「复习」、「工具」、「学习路径」、工具子页按钮、`ProgressBoard` 的 `onOpenReview` / `onApply`。

收成一个函数，避免每处手写：

```ts
const navigate = (update: () => void, type: "forward" | "back" | "swap" = "swap") =>
  startTransition(() => {
    addTransitionType(type);
    update();
  });
```

- `forward`（路径 → 关卡）：新页从下往上浮入
- `back`（关卡 → 路径）：反向
- `swap`（工具页之间）：默认交叉淡入

`<ViewTransition>` 包住 `<Content>` 里那棵三元树，不包 `KeyboardPanel`（抽屉在树外，有自己的动效）。

**共享元素**：路径节点的标题 ↔ 关卡页的标题，名字是 `level-title-${id}`。

- 路径侧：`PathMap.tsx` 里 `path-node-name` 那个 `span`
- 关卡侧：**新建** `src/ui/LessonHeader.tsx`，`LessonFlow` 和 `LessonOne` 都放在 `<Steps>` 之前，整个关卡生命周期都在。现在的标题只在第 0 步的 antd `Card title` 里，切到别的步骤就没了，而且 antd 的字符串 title 包不进去

27 个节点都带名字：进关时没配对的那 26 个按 exit 淡出，跟页面一起走，这是预期行为。

**关卡内切步骤**（概念 → 听辨 → …）也包 `startTransition`，用默认交叉淡入。

### 4.4 音效总线与混响

现在的问题：`playSfx` 每次新建一个 `GainNode`（0.7）接到 master，响完也不断开。音量旋钮拧不到正在响的声音。

改成**懒创建的常驻总线**（第一次 `playSfx` 时建，不在 `createEngine()` 里建——`tests/audio/engine.test.ts` 的 `FakeAudioContext` 没有 `createConvolver`，构造期创建会让 12 个引擎测试全挂）：

```
sfxBus（入口，增益 1）
  ├─→ sfxOut                         干声
  └─→ reverb → wet(0.18) → sfxOut    湿声
sfxOut (gain = 0.7 × 用户音量，静音时 0) → master
```

- 音量放在干湿相加之后：放在混响上游的话，静音只切断新输入，已经在混响里的尾巴还会响完 1 秒多
- 湿声回到下游的 `sfxOut`，不回到入口 `sfxBus`（会回授）
- 冲激响应在 AudioContext 建好后的空闲时间预先生成（`requestIdleCallback`），不挤在第一次点击的同步链路里
- master 的 0.8 不动：那是钢琴、听辨、侧链共用的电平
- `playPump` 自己的总线不挂混响

冲激响应程序生成，不用文件：

```ts
function createRoomReverb(context: AudioContext, seconds = 1.4, decay = 3): ConvolverNode {
  const length = Math.floor(context.sampleRate * seconds);
  const impulse = context.createBuffer(2, length, context.sampleRate);
  for (let channel = 0; channel < 2; channel += 1) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** decay;
    }
  }
  const convolver = context.createConvolver();
  convolver.buffer = impulse;
  return convolver;
}
```

`MusicEngine` 新增：

```ts
/** 反馈音的音量，0–1。静音 = 0。立刻作用在正在响的声音上。 */
setSfxVolume(volume: number): void;
```

**只管反馈音**，不管钢琴和听辨题。听辨题的声音是内容，不是提示，静音开关不该让题目没法做。

### 4.5 声音偏好

新的 localStorage 键 `music-101.settings`，跟 `music-101.progress` 平行。**不塞进 `ProgressFile`**：它的 `normalize` 会丢掉未知字段，而且偏好不该随进度备份覆盖。

```ts
// src/core/prefs.ts —— 纯函数，不碰 DOM
export interface SoundPrefs {
  sfxVolume: number; // 0–1，默认 0.8
  sfxMuted: boolean; // 默认 false
}
export function parseSoundPrefs(raw: string | null): SoundPrefs;
export function serializeSoundPrefs(prefs: SoundPrefs): string;
export function effectiveSfxVolume(prefs: SoundPrefs): number; // 静音 → 0
```

坏数据（不是 JSON、字段类型不对、音量越界）一律回退默认值并夹到 0–1。

**开关放在顶栏「键盘」按钮旁边**：那是 learn / tools 两种模式共有的位置。放进 learn 分支的话，复习页和工具页里反馈音照响，开关却不见了。

`src/ui/SoundToggle.tsx`：一个按钮（`aria-haspopup="dialog"` + `aria-expanded`；它打开弹层，不切换静音，所以不用 `aria-pressed`；静音状态写在 `aria-label` 里），点开 antd `Popover`，里面一条 `Slider` + 一个「静音」`Switch`。拖动音量时实时调用 `setSfxVolume`，并播一声 `correct` 让人听见音量。

### 4.6 新增音效

`SfxCue` 扩成 `"correct" | "wrong" | "pass" | "select" | "milestone"`。

| cue | 形状 | 何时 |
|---|---|---|
| `select` | 调内第 5 级的单个 `pure` 短音，0.06 秒，很轻 | 选中一个**没有声音**的选项（有声音的选项选中时直接播它自己的声音——那是题目内容，两个声音会打架） |
| `milestone` | 调内主三和弦**同时**响，`pluck`，整体延后 0.28 秒 | 连对达到 5、10。跟 `correct` 同一时刻调用，延后量保证它排在上行三度之后 |

`correct` 加 `streak` 参数：**连对时上行三度一路往音阶上爬**。

```ts
export interface SfxOptions {
  keyRoot?: PitchClass;
  keyScale?: ScaleId;
  /** 连对第几题，从 1 开始。缺省 = 1。 */
  streak?: number;
}

// correct 分支
const degree = Math.min(Math.max((options.streak ?? 1) - 1, 0), 4); // 第 1–5 级
const from = base + (intervals[degree] ?? 0);
const upper = degree + 2;
const to = base + (intervals[upper % 7] ?? 0) + (upper >= 7 ? 12 : 0);
```

`streak` 缺省时**必须原样**等于现在的两音上行三度：`tests/audio/sfx.test.ts` 锁着长度 2、音程等于该调三度、`first.midi % 12 === keyRoot`。新增的断言：

- streak 1–5 的第一个音严格上行，并且都落在调内
- streak > 5 封顶在第 5 级，不再往上爬
- 每一档的两个音之间都是调内三度（大三度或小三度，按调定）

### 4.7 可按压按钮

答题会话里的主按钮（检查 / 继续）和选项块用原生 `<button>`，不用 antd：antd 的 CSS-in-JS 长不出这个效果。

```css
.m101-press {
  box-shadow: 0 4px 0 var(--m101-press-shadow);
  transition:
    transform var(--m101-dur-fast) var(--m101-ease-out),
    box-shadow var(--m101-dur-fast) var(--m101-ease-out);
}
.m101-press:active:not(:disabled) {
  transform: translateY(4px);
  box-shadow: 0 0 0 var(--m101-press-shadow);
}
```

`box-shadow` 只触发重绘、不触发布局，不违反「只动 transform / opacity」的本意（那条规矩防的是布局重排）。`--m101-press-shadow` 及其语义色变体进 token。

---

## 5. U1：答题会话

### 5.1 一个会话长什么样

```
┌──────────────────────────────────────────┐
│ ▓▓▓▓▓▓▓▓░░░░░░░░░░   3 / 8      连对 ×3 │  ← 进度条 + 连对
├──────────────────────────────────────────┤
│  哪一对是半音？                 [盲听]    │
│                                          │
│  ┌ 1 ┐  C4 → C♯4                 ▶     │  ← 选项块，可按压
│  ┌ 2 ┐  C4 → D4                  ▶     │
│  ┌ 3 ┐  E4 → F4                  ▶     │
│                                          │
├──────────────────────────────────────────┤
│                              [ 检查 ]    │  ← 底栏
└──────────────────────────────────────────┘
          ↓ 检查之后，底栏升起成判定条
┌──────────────────────────────────────────┐
│ ✓ 对，挨着的两个键就是半音。   [ 继续 ]  │  绿
│   C 到 C♯ 只隔一个键……                  │
└──────────────────────────────────────────┘
```

**一次只显示一题**。题目切换用 `AnimatePresence mode="wait"`：旧题向左滑出、新题从右滑入（`x: 24 → 0 → -24` + opacity，`springs.base`）。

### 5.2 状态机（纯逻辑）

`src/core/lesson/session.ts`，不 import React、不碰 DOM，`tests/lesson/session.test.ts` 直接守卫。

```ts
export type QuestionPhase =
  | "answering"   // 还没检查；可以改选
  | "wrong"       // 检查过、错了；可以「再试一次」，错满 2 次可以「看答案」
  | "correct"     // 检查过、对了；已定稿
  | "revealed";   // 看了答案；已定稿，计为错

export interface SessionPolicy {
  /** 错几次之后允许看答案。关卡 = 2，复习 = 1。 */
  revealAfter: number;
  /** 错了能不能再试。关卡 = true，复习 = false（错一次就直接亮答案）。 */
  allowRetry: boolean;
}

export interface SessionState {
  cursor: number;                     // 当前第几题
  selected: (number | null)[];        // 当前选中（未定稿）
  phase: QuestionPhase[];
  attempts: number[];                 // 每题错了几次
  committed: (number | null)[];       // 定稿的答案 —— 只有这个写进 earAnswers
  firstTry: boolean[];                // 第一次检查就对
  streak: number;
  bestStreak: number;
  startedAt: number;
  finishedAt: number | null;
}

export type SessionAction =
  | { type: "select"; choice: number }
  | { type: "check" }
  | { type: "retry" }
  | { type: "reveal" }
  | { type: "continue"; now: number };

export function createSession(questions: readonly { correct: number }[], now: number): SessionState;
export function sessionReducer(
  state: SessionState,
  action: SessionAction,
  questions: readonly { correct: number }[],
  policy: SessionPolicy,
): SessionState;
export function sessionSummary(state: SessionState): {
  total: number;
  firstTryCorrect: number;
  bestStreak: number;
  seconds: number | null;
};
```

**不变量**（测试逐条守）：

1. **`committed` 只在定稿时写**：`check` 判对 → 写入正确下标；`reveal` → 写入最后那个错下标。错了没定稿时保持 `null`。这是为了不动评分：`stageEarScore` 把任何非 null 都当成「已答」
2. **看了答案仍然算错**：`revealed` 的 `committed` 是错下标，绝不改成正确下标，也不改回 `null`。否则 `buildAttempt` 的 `easy`（必须全对）和 `earPass` 会被放水
3. `continue` 只在当前题已定稿（`correct` / `revealed`）时生效；最后一题 `continue` → 写 `finishedAt`
4. `select` 在已定稿的题上无效（锁死，修掉现在 `lockCorrect` 锁不住改选的问题）
5. 判对 → `streak + 1`，并更新 `bestStreak`；判错 → `streak = 0`
6. 复习策略（`allowRetry: false, revealAfter: 1`）：判错直接进入 `revealed`（这跟复习页现在的语义一致）

### 5.3 状态放在哪

**会话状态由 `LessonFlow` / `LessonOne` 持有**，不放在会随题卸载的组件里。现在 `EarQuiz` 的 `attempts` / `revealed` 一离开听辨步就丢，「看答案」要重新错两次才出现——这个问题顺手修掉。

- 换关时，跟 `emptyStageState` 一起重置（`LessonFlow` 第 88–93 行那个 effect）
- 每次 reducer 产出新状态，`committed` 同步进 `state.earAnswers`。`stageEarScore`、`diagnoseStage`、进度结算（`observeAttempt`）**一行不改**
- 结算 effect 的 `step < 3 && !passed` 守卫和首帧只 `recordVisit` 的 early return **保持原样**

### 5.4 选项洗牌

关卡内的选项也洗牌，修掉 2–8 关「答案总在第一个」。

- 复用 `review.ts` 的 `shuffleChoices`，种子 `${lesson.id}#${visitId}#${questionId}`：同一次进关刷新不变，下次进关换位置
- **洗牌只发生在显示层**：`selected` / `committed` 始终存**原始下标**。显示顺序 → 原始下标的映射由 `session.ts` 的 `displayOrder()` 给出并测试。这样 `earAnswers`、配方、复习卡都不受影响

### 5.5 盲听

内容层给 `StageEar` 加一个可选字段：

```ts
/** 盲听：选项文字等检查之后才显示，只能靠耳朵分。 */
blind?: boolean;
```

**为什么不全局开**：现在有 64 道题的选项声音完全或部分相同（见 §9）。对这些题，盲听等于让人瞎猜。所以由内容显式声明，并加守卫：

- `blind: true` 的题，所有选项的 `midis` 必须两两不同（`tests/lesson/ear-feedback.test.ts` 新增）
- U1 只在 2–8 关和 14–17 关里挑「选项文字就是声音本身的名字」的题打开（音名、和弦名、进行名）。阶段二、三里 `midis` 只是层数编码的题一律不开

盲听题的呈现：

- 进题自动播一遍全部选项（A、B、C 依次，间隔沿用复习页的 900ms），**在「继续」按钮的点击同步栈里启动**——放进 `useEffect` 会在第一题静音
- 选项块显示成 `A` / `B` / `C` + 一个播放图标，文字不进 DOM；无障碍名字是「选项 A」，不能是答案文字
- 检查之后文字淡入
- 题头一个「盲听」小标签，让人知道为什么看不到字

### 5.6 键盘

| 键 | 作用 |
|---|---|
| `1`–`9` | 选第 N 个选项（按显示顺序） |
| `Enter` | 有选中 → 检查；已判定 → 继续；判错 → 再试一次 |
| `Space` | 重播当前选中项；没选中 → 播全部 |

- 在 `window` 上监听，自己处理的键 `preventDefault`，否则焦点在按钮上时 Space/Enter 会再触发一次点击
- 输入框里不抢（复用 `keyboard.ts` 的 `isTypingTarget`）
- 跟弹琴键（`A S D F G H J` / `W E T Y U` / `Z X`）、全局 `K` 不冲突
- 选项块上显示数字角标，让人知道能按

### 5.7 连对

- 进度条右边显示「连对 ×N」，N ≥ 2 才出现；每加一弹一下（`springs.snappy` 的 scale 1 → 1.15 → 1）
- 判对时播 `correct`，带 `streak`
- 达到 5、10 时追加 `milestone`，连对标签换成金色并带一圈光晕——这是 §3 放宽的「庆祝时刻」之一

### 5.8 结算页

一轮听辨做完（最后一题 `continue`）显示结算页，取代题目区：

- 三个数字：第一次就对 `x / N`、最长连对、用时（`m:ss`）。数字从 0 跑到终值（`springs.soft`）
- 是否达到 `earPass`：达到 → 盖章「听辨通过」+ 彩带 + `pass` 音；没达到 → 「还差 k 题」+「重做这一轮」按钮
- 「继续」→ 进手做步
- `pass` 音在**最后一题「继续」的点击里**同步播出，不放进 effect
- 再次进入听辨步时，已完成的会话直接显示结算页，可以「重做这一轮」（重建会话，`committed` 清空 → `earAnswers` 清空）

### 5.9 彩带

`src/ui/session/Confetti.tsx`：一个绝对定位的 `<canvas>`，约 60 片，1.2 秒，重力 + 空气阻力，颜色取 `palette.brand` / `palette.accent` / `palette.success`。`prefers-reduced-motion` 为真时整个组件返回 `null`。

### 5.10 复用范围

| 调用方 | 策略 | 说明 |
|---|---|---|
| `LessonFlow` 听辨步 | `{ revealAfter: 2, allowRetry: true }` | 两级提示照旧 |
| `LessonOne` 听辨步 | 同上 | 顺手把 `wrongHint` / `encourage` 接上（现在适配器把它们丢了） |
| `ReviewDeck` | `{ revealAfter: 1, allowRetry: false }` | 外观统一成会话；**评分时机从「点选项」改成「点检查」**，仍在点击里调用 `gradeReview`，Leitner 升降规则不变 |

`EarQuiz.tsx` 和 `QuizFeedback.tsx` 由新组件取代后删除；`QuizOption.tsx` 的 `QuizGroup` 仍给手做步用，不动。

### 5.11 组件拆分

```
src/core/lesson/session.ts        状态机 + displayOrder + sessionSummary（纯函数）
src/core/prefs.ts                 声音偏好（纯函数）
src/ui/session/QuizSession.tsx    编排：进度条 + 题目 + 底栏 + 结算
src/ui/session/SessionProgress.tsx  进度条 + 连对
src/ui/session/SessionQuestion.tsx  题干 + 选项块（含盲听）
src/ui/session/CheckSheet.tsx     底栏 / 判定条
src/ui/session/SessionSummary.tsx 结算页
src/ui/session/Confetti.tsx       彩带
src/ui/session/useSessionKeys.ts  键盘
src/ui/session/session.css        会话样式
src/ui/LessonHeader.tsx           关卡标题（共享元素目标）
src/ui/SoundToggle.tsx            声音开关
```

`QuizSession` 是受控组件：

```ts
export function QuizSession(props: {
  questions: readonly SessionQuestionData[];
  state: SessionState;
  onState: (next: SessionState) => void;
  policy: SessionPolicy;
  /** 显示层洗牌的种子前缀。 */
  seed: string;
  /** 第一次答错时的整关回退提示（题目自己没写 wrongHint 时用）。 */
  fallbackHint: string;
  keyRoot: PitchClass;
  keyScale: ScaleId;
  passMark: number;
  onFinish: () => void;
  /** 复习页每判一题要记盒子。 */
  onGraded?: (index: number, correct: boolean) => void;
}): JSX.Element;
```

**音效必须在点击的同步链路里**（产品规格 §6.2）。所以 `QuizSession` 不是「dispatch 完在 effect 里根据新状态播音」，而是在处理 `check` / `continue` 的事件函数里先算出新状态、同步播音，再 `onState(next)`。

---

## 6. 守卫测试

| 层 | 测试 | 断言 |
|---|---|---|
| 状态机 | `tests/lesson/session.test.ts`（新） | §5.2 的六条不变量；`displayOrder` 同种子稳定、是排列、映射回原始下标正确；`sessionSummary` 计数 |
| 音效 | `tests/audio/sfx.test.ts`（扩） | streak 缺省不变；1–5 上行、调内、封顶；`select` / `milestone` 的形状 |
| 偏好 | `tests/core/prefs.test.ts`（新） | 坏数据回退默认值；音量夹到 0–1；静音 → 有效音量 0 |
| 盲听 | `tests/lesson/ear-feedback.test.ts`（扩） | `blind` 的题选项音频两两不同 |
| token | `tests/ui/theme.test.ts`（扩） | `springs` 三档都在；**扫描范围加上 `src/ui/session/session.css` 和 `src/ui/path.css`**（现在只扫 `styles.css` 和 `motion.css`，新 CSS 里写错变量名不会被发现） |
| 引擎 | `tests/audio/engine.test.ts`（扩） | mock 补 `createConvolver`；`playSfx` 两次只建一次总线；`setSfxVolume(0)` 后总线增益为 0 |

vitest 跑在 `node` 环境，没有组件测试。界面行为用浏览器实跑验证：

- 一题一题走完 8 题；第一次错只给方向、第二次错出现「看答案」、看了之后锁死并计为错
- 1/2/3、Enter、Space 生效；焦点在按钮上时 Space 不会重复触发
- 盲听题文字在检查前不在 DOM 里
- 路径 → 关卡有共享元素过渡；关卡 → 路径反向
- 开启系统「减少动态效果」后：无滑动、无彩带、无 view transition 动画，功能照常
- 静音后反馈音全无，听辨题的声音照常

---

## 7. 不做的事（本期）

- **过关时回放你做的那 2 小节**：需要一个通用的骨架播放器（现在引擎只有 `playSteps` / `playPump`），放到 U3 手做步改造一起做
- 路径图改造（U2）
- 手做步的交互改造（U3）
- 移动端专门适配
- 内容层的错（§9）

---

## 8. 分期内的顺序

1. U0-a：Motion 接入 + 弹簧 token + reduced-motion 三处降级
2. U0-b：音效总线 + 混响 + `setSfxVolume` + 声音偏好 + `SoundToggle`
3. U0-c：`streak` / `select` / `milestone` 音效
4. U0-d：View Transition 导航 + `LessonHeader` 共享元素
5. U1-a：`session.ts` 状态机 + 测试
6. U1-b：`QuizSession` 组件群 + 键盘 + 结算 + 彩带，接进 `LessonFlow`
7. U1-c：接进 `LessonOne`（补上 `wrongHint` / `encourage`）
8. U1-d：接进 `ReviewDeck`
9. U1-e：`blind` 字段 + 守卫 + 给合格的题打开
10. 浏览器实跑验证 + 删除 `EarQuiz` / `QuizFeedback`

---

## 9. 附：本期不修、但已查明的内容问题

另开一份规格处理。记在这里是因为 §5.5 的盲听守卫依赖它们：

- 170 道听辨题里，35 道所有选项的声音完全相同、29 道有两个选项声音相同
- 2–8 关 56 道题里 54 道正确项在第一个（§5.4 的显示层洗牌先把体验修掉，数据本身另修）
- 第 14 关「V 最常解决到哪里？」的选项「I」播的是 G（`[67]`），应该是 C
- 阶段二、三的听辨题全用纯音播，引擎里的 `kick` / `bass` / `supersaw` 没用上
- 第 13、18–26 关手做只有 2 个选项；诊断步的「改成正确答案」一键过关
