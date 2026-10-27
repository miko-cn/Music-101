# Music-101 U0 + U1 实现计划：动效地基与答题会话

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 给 Music-101 接上 Motion 动效、View Transition 页面切换、带混响和音量的反馈音，并把听辨从「整页铺开、点了就判」改成 Duolingo 式的一题一题答题会话。

**架构：** 纯逻辑（会话状态机、音效音高、声音偏好）放 `src/core/`，全部有 vitest 守卫；界面放 `src/ui/session/`，受控组件，状态由关卡页持有；音效永远在点击的同步链路里触发。

**技术栈：** React 19.3（`ViewTransition` / `startTransition` / `addTransitionType`）、`motion`（`LazyMotion` + `m` + `domAnimation`）、Web Audio、antd 6、vitest（node 环境，无组件测试）。

**规格：** `docs/superpowers/specs/2026-10-27-music-101-u0-u1-motion-session-design.md`

---

## 全局约定（每个任务都适用）

- **相对 import 必须带扩展名**（`./foo.ts`、`./foo.tsx`、`./foo.css`），`tests/guard/import-extensions.test.ts` 会查。包名 import（`motion/react`）不受限。
- `verbatimModuleSyntax` 打开：纯类型用 `import type`。
- 新 CSS 变量一律 `--m101-*`，并且必须由 `src/ui/theme.ts` 的 `tokenStylesheet()` 发出。
- 组件里不许现编时长 / 缓动 / 弹簧参数：CSS 用 `var(--m101-dur-*)` / `var(--m101-ease-*)`，Motion 用 `springs.*`。
- 全站只用 `m.*`（`import * as m from "motion/react-m"`），不用 `motion.*`——`LazyMotion strict` 会直接抛错。
- **音效只能在事件处理函数的同步链路里播**，不能放进 `useEffect`。
- 注释风格跟现有代码一致：中文、讲约束和理由，不写「下一行做什么」。
- 每个任务结束：`npm run typecheck` 和 `npm test` 全绿，再 commit。commit message 用中文 Conventional Commits（`feat(ui): …`）。

## 文件结构

| 文件 | 职责 | 任务 |
|---|---|---|
| `src/ui/theme.ts` | 新增 `springs`、按压阴影 token | 1, 6 |
| `src/main.tsx` | `MotionConfig` + `LazyMotion` | 1 |
| `src/ui/motion.css` | View Transition 动效与降级、`.m101-press` | 1, 6, 8 |
| `src/core/audio/sfx.ts` | `streak` / `select` / `milestone` | 2 |
| `src/core/prefs.ts`（新） | 声音偏好解析与序列化 | 3 |
| `src/core/audio/engine.ts` | 常驻反馈音总线 + 混响 + `setSfxVolume` | 4 |
| `src/ui/soundPrefs.ts`（新） | 声音偏好的界面层 store | 4 |
| `src/ui/useFeedbackSfx.ts` | `playFeedbackSfx` + streak 透传 + 应用音量 | 4 |
| `src/ui/SoundToggle.tsx`（新） | 顶栏声音开关 | 4 |
| `src/core/lesson/session.ts`（新） | 会话状态机、`displayOrder`、`sessionSummary` | 5 |
| `src/ui/session/*`（新） | 会话界面组件群 | 6, 9 |
| `src/ui/LessonFlow.tsx` | 听辨步换成会话 | 6 |
| `src/ui/LessonOne.tsx` / `src/ui/ReviewDeck.tsx` | 换成会话 | 7 |
| `src/App.tsx` / `src/ui/PathMap.tsx` / `src/ui/LessonHeader.tsx`（新） | View Transition 导航与共享元素 | 8 |
| `src/content/types.ts` + 若干关卡文件 | `blind` 字段 | 9 |

---

### 任务 1：接入 Motion 与弹簧 token

**文件：**
- 修改：`package.json`（`npm i motion`）
- 修改：`src/ui/theme.ts`（在 `easings` 之后加 `springs`）
- 修改：`src/main.tsx`
- 修改：`src/ui/motion.css`（末尾的 reduced-motion 区块）
- 测试：`tests/ui/theme.test.ts`

- [ ] **步骤 1：安装依赖**

运行：`npm i motion`
预期：`package.json` 的 `dependencies` 出现 `"motion"`。

- [ ] **步骤 2：写失败的测试**（加进 `tests/ui/theme.test.ts`）

```ts
import { springs } from "../../src/ui/theme.ts";

it("弹簧只有三档，且都是物理弹簧", () => {
  expect(Object.keys(springs).sort()).toEqual(["base", "snappy", "soft"]);
  for (const spring of Object.values(springs)) {
    expect(spring.type).toBe("spring");
    expect(spring.stiffness).toBeGreaterThan(0);
    expect(spring.damping).toBeGreaterThan(0);
  }
});

it("View Transition 的伪元素也有 reduced-motion 降级", () => {
  const css = readFileSync(resolve(root, "src/ui/motion.css"), "utf8");
  expect(css).toMatch(/::view-transition-group\(\*\)/);
});
```

（`readFileSync` / `resolve` / `root` 沿用该文件里已有的写法；如果名字不同，照文件现状改。）

- [ ] **步骤 3：运行确认失败**

运行：`npx vitest run tests/ui/theme.test.ts`
预期：FAIL，`springs` 未导出。

- [ ] **步骤 4：实现**

`src/ui/theme.ts`，放在 `easings` 后面：

```ts
/**
 * Motion 的物理弹簧。
 *
 * 不叫 spring：easings.spring 是 CSS 的回弹曲线，跟物理弹簧不是一回事。
 * 组件里不许现编 stiffness / damping，只从这三档里取。
 */
export const springs = {
  /** 判定条、按钮按下：快、几乎不回弹。 */
  snappy: { type: "spring", stiffness: 520, damping: 32 },
  /** 题目切换、进度条：默认。 */
  base: { type: "spring", stiffness: 380, damping: 30 },
  /** 结算页、盖章：慢一点、有一点回弹。 */
  soft: { type: "spring", stiffness: 220, damping: 22 },
} as const;
```

`src/main.tsx`：

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { LazyMotion, MotionConfig, domAnimation } from "motion/react";
import { App } from "./App.tsx";
import { springs, tokenStylesheet } from "./ui/theme.ts";
import "./styles.css";
import "./ui/motion.css";

// …原有 tokenStyle 注入与 container 检查不动…

createRoot(container).render(
  <StrictMode>
    {/* reducedMotion="user"：CSS 那条全局降级管不到 Motion 的 JS 动画，这里单独接住。 */}
    <MotionConfig reducedMotion="user" transition={springs.base}>
      <LazyMotion features={domAnimation} strict>
        <App />
      </LazyMotion>
    </MotionConfig>
  </StrictMode>,
);
```

`src/ui/motion.css`：在现有 `@media (prefers-reduced-motion: reduce)` 块里追加（`*` 选不中 View Transition 的伪元素）：

```css
  ::view-transition-group(*),
  ::view-transition-old(*),
  ::view-transition-new(*) {
    animation: none !important;
  }
```

- [ ] **步骤 5：运行确认通过**

运行：`npm run typecheck; npm test`
预期：全部 PASS。

- [ ] **步骤 6：Commit**

```bash
git add package.json package-lock.json src/ui/theme.ts src/main.tsx src/ui/motion.css tests/ui/theme.test.ts
git commit -m "feat(ui): 接入 Motion，弹簧 token 与三处 reduced-motion 降级"
```

---

### 任务 2：连对爬音阶、`select`、`milestone` 音效

**文件：**
- 修改：`src/core/audio/sfx.ts`
- 修改：`src/core/audio/engine.ts`（只改 `renderSfxStep` 接受 `gain`）
- 测试：`tests/audio/sfx.test.ts`

- [ ] **步骤 1：写失败的测试**（追加到 `tests/audio/sfx.test.ts`）

```ts
import { getScalePitches } from "../../src/core/theory/scale.ts";

const SCALES = ["major", "naturalMinor", "harmonicMinor", "melodicMinor"] as const;

describe("连对爬音阶", () => {
  it("streak 缺省、streak 1、streak 0 都等于原来的答对音", () => {
    const plain = sfxSteps("correct");
    expect(sfxSteps("correct", { streak: 1 })).toEqual(plain);
    expect(sfxSteps("correct", { streak: 0 })).toEqual(plain);
  });

  it("1–5 档：第一个音严格上行，两个音都在调内，间隔是调内三度", () => {
    for (const keyScale of SCALES) {
      for (let keyRoot = 0; keyRoot < 12; keyRoot += 1) {
        const inKey = new Set<number>(getScalePitches(keyRoot as never, keyScale));
        let previous = -Infinity;
        for (let streak = 1; streak <= 5; streak += 1) {
          const [first, second] = sfxSteps("correct", { keyRoot: keyRoot as never, keyScale, streak });
          expect(first.midi).toBeGreaterThan(previous);
          previous = first.midi;
          expect(inKey.has(first.midi % 12)).toBe(true);
          expect(inKey.has(second.midi % 12)).toBe(true);
          expect([3, 4]).toContain(second.midi - first.midi);
        }
      }
    }
  });

  it("超过 5 档封顶，不再往上爬", () => {
    expect(sfxSteps("correct", { streak: 9 })).toEqual(sfxSteps("correct", { streak: 5 }));
  });
});

describe("select 与 milestone", () => {
  it("select：一个很轻的短音，落在调内第 5 级", () => {
    const steps = sfxSteps("select", { keyRoot: 2, keyScale: "major" });
    expect(steps).toHaveLength(1);
    expect(steps[0].duration).toBeLessThanOrEqual(0.08);
    expect(steps[0].gain).toBeLessThan(1);
    expect((steps[0].midi - 2) % 12).toBe(7);
  });

  it("milestone：主三和弦同时响，整体排在答对音之后", () => {
    for (const keyScale of SCALES) {
      const steps = sfxSteps("milestone", { keyRoot: 0, keyScale });
      expect(steps).toHaveLength(3);
      const offsets = new Set(steps.map((step) => step.offset));
      expect(offsets.size).toBe(1);
      const correctEnd = Math.max(...sfxSteps("correct").map((step) => step.offset));
      expect(steps[0].offset).toBeGreaterThan(correctEnd);
      const root = steps[0].midi;
      expect(steps.map((step) => step.midi - root)).toEqual([0, SCALE_INTERVALS[keyScale][2], SCALE_INTERVALS[keyScale][4]]);
    }
  });
});
```

（`SCALE_INTERVALS` 如果文件顶部还没 import，从 `../../src/core/theory/scale.ts` 补上。`getScalePitches` 的第一个参数类型若是 `PitchClass`，测试里用 `as never` 或 `as PitchClass` 都行，照文件现有写法。）

- [ ] **步骤 2：运行确认失败**

运行：`npx vitest run tests/audio/sfx.test.ts`
预期：FAIL（`"select"` 不是合法 cue / `gain` 不存在）。

- [ ] **步骤 3：实现**

`src/core/audio/sfx.ts`：

```ts
/** 反馈音。 */
export type SfxCue = "correct" | "wrong" | "pass" | "select" | "milestone";

export interface SfxStep {
  voice: SfxVoice;
  midi: number;
  offset: number;
  duration: number;
  /** 相对音量，缺省 1。select 这种只是「点到了」的提示要很轻。 */
  gain?: number;
}

export interface SfxOptions {
  keyRoot?: PitchClass;
  keyScale?: ScaleId;
  /** 连对第几题，从 1 开始。缺省 = 1。只影响 correct。 */
  streak?: number;
}

/** 连对最多爬到第 5 级：再往上就出了舒服的音区。 */
const STREAK_TOP_DEGREE = 4;

/** milestone 整体延后的秒数：跟 correct 同时调用，要排在上行三度之后。 */
export const MILESTONE_DELAY = 0.28;
```

`correct` 分支改成：

```ts
  if (cue === "correct") {
    // 连对时上行三度一路往音阶上爬：第 1 题从主音起，第 5 题从第 5 级起。
    // 起点和终点都取调内音，所以每一档都是调内三度（大三或小三，按调定）。
    const degree = Math.min(Math.max((options.streak ?? 1) - 1, 0), STREAK_TOP_DEGREE);
    const from = base + (intervals[degree] ?? 0);
    const to = base + (intervals[degree + 2] ?? 4);
    return [
      { voice: "pluck", midi: from, offset: 0, duration: 0.16 },
      { voice: "pluck", midi: to, offset: 0.09, duration: 0.24 },
    ];
  }
```

在 `wrong` 分支之后、`pass` 之前加：

```ts
  if (cue === "select") {
    // 选中一个没有声音的选项：很轻的一下，告诉你「点到了」，不抢判定音的戏。
    return [{ voice: "pure", midi: base + (intervals[4] ?? 7), offset: 0, duration: 0.06, gain: 0.35 }];
  }

  if (cue === "milestone") {
    // 连对里程碑：主三和弦同时响，像一声和弦落定。
    const third = intervals[2] ?? 4;
    const fifth = intervals[4] ?? 7;
    return [0, third, fifth].map((interval) => ({
      voice: "pluck" as const,
      midi: base + interval,
      offset: MILESTONE_DELAY,
      duration: 0.5,
    }));
  }
```

`src/core/audio/engine.ts`：`renderSfxStep` 多收一个 `gain = 1` 参数，三条音色支路的 `envelope(...)` 峰值乘上它；`playSfx` 的循环里传 `step.gain ?? 1`。

- [ ] **步骤 4：运行确认通过**

运行：`npm run typecheck; npm test`
预期：全部 PASS（原有的 sfx 断言一条不改也要过）。

- [ ] **步骤 5：Commit**

```bash
git add src/core/audio/sfx.ts src/core/audio/engine.ts tests/audio/sfx.test.ts
git commit -m "feat(audio): 连对爬音阶，新增 select 与 milestone 提示音"
```

---

### 任务 3：声音偏好（纯逻辑）

**文件：**
- 创建：`src/core/prefs.ts`
- 测试：`tests/core/prefs.test.ts`

- [ ] **步骤 1：写失败的测试**

```ts
import { describe, expect, it } from "vitest";
import {
  DEFAULT_SOUND_PREFS,
  SETTINGS_KEY,
  effectiveSfxVolume,
  parseSoundPrefs,
  serializeSoundPrefs,
} from "../../src/core/prefs.ts";

describe("声音偏好", () => {
  it("键名跟进度分开", () => {
    expect(SETTINGS_KEY).toBe("music-101.settings");
  });

  it("没有数据 / 坏数据都回退默认值", () => {
    for (const raw of [null, "", "not json", "42", "null", "[]", '{"sound":"x"}']) {
      expect(parseSoundPrefs(raw)).toEqual(DEFAULT_SOUND_PREFS);
    }
  });

  it("往返不丢东西", () => {
    const prefs = { sfxVolume: 0.35, sfxMuted: true };
    expect(parseSoundPrefs(serializeSoundPrefs(prefs))).toEqual(prefs);
  });

  it("音量夹到 0–1，类型不对的字段单独回退", () => {
    expect(parseSoundPrefs('{"sound":{"sfxVolume":3,"sfxMuted":false}}').sfxVolume).toBe(1);
    expect(parseSoundPrefs('{"sound":{"sfxVolume":-1,"sfxMuted":false}}').sfxVolume).toBe(0);
    expect(parseSoundPrefs('{"sound":{"sfxVolume":"loud","sfxMuted":true}}')).toEqual({
      sfxVolume: DEFAULT_SOUND_PREFS.sfxVolume,
      sfxMuted: true,
    });
  });

  it("静音时有效音量是 0", () => {
    expect(effectiveSfxVolume({ sfxVolume: 0.6, sfxMuted: true })).toBe(0);
    expect(effectiveSfxVolume({ sfxVolume: 0.6, sfxMuted: false })).toBe(0.6);
  });
});
```

- [ ] **步骤 2：运行确认失败**

运行：`npx vitest run tests/core/prefs.test.ts`
预期：FAIL，模块不存在。

- [ ] **步骤 3：实现** `src/core/prefs.ts`

```ts
/**
 * 声音偏好。
 *
 * 单独一把 localStorage 键，不塞进 music-101.progress：
 * ProgressFile 的 normalize 会丢掉不认识的字段，而且偏好不该跟着进度备份一起被覆盖
 * （换电脑导入进度时，没人想顺便把音量也导回去）。
 *
 * 纯函数，不碰 localStorage：读写由界面层的 store 做。
 */
export const SETTINGS_KEY = "music-101.settings";

export interface SoundPrefs {
  /** 反馈音音量，0–1。只管反馈音，不管钢琴和听辨题。 */
  sfxVolume: number;
  sfxMuted: boolean;
}

export const DEFAULT_SOUND_PREFS: SoundPrefs = { sfxVolume: 0.8, sfxMuted: false };

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseSoundPrefs(raw: string | null): SoundPrefs {
  if (!raw) return { ...DEFAULT_SOUND_PREFS };
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return { ...DEFAULT_SOUND_PREFS };
  }
  if (!isRecord(value) || !isRecord(value.sound)) return { ...DEFAULT_SOUND_PREFS };
  const { sfxVolume, sfxMuted } = value.sound;
  return {
    sfxVolume:
      typeof sfxVolume === "number" && Number.isFinite(sfxVolume)
        ? clamp01(sfxVolume)
        : DEFAULT_SOUND_PREFS.sfxVolume,
    sfxMuted: typeof sfxMuted === "boolean" ? sfxMuted : DEFAULT_SOUND_PREFS.sfxMuted,
  };
}

export function serializeSoundPrefs(prefs: SoundPrefs): string {
  return JSON.stringify({ schema: 1, sound: { sfxVolume: clamp01(prefs.sfxVolume), sfxMuted: prefs.sfxMuted } });
}

export function effectiveSfxVolume(prefs: SoundPrefs): number {
  return prefs.sfxMuted ? 0 : clamp01(prefs.sfxVolume);
}
```

- [ ] **步骤 4：运行确认通过**

运行：`npm run typecheck; npm test`
预期：全部 PASS。

- [ ] **步骤 5：Commit**

```bash
git add src/core/prefs.ts tests/core/prefs.test.ts
git commit -m "feat(prefs): 声音偏好单独存一把键"
```

---

### 任务 4：常驻反馈音总线、混响、音量开关

**文件：**
- 修改：`src/core/audio/engine.ts`
- 修改：`tests/audio/engine.test.ts`（mock 补 `createConvolver`、`gain.setTargetAtTime`）
- 创建：`src/ui/soundPrefs.ts`
- 修改：`src/ui/useFeedbackSfx.ts`
- 创建：`src/ui/SoundToggle.tsx`
- 修改：`src/App.tsx`（顶栏「键盘」按钮左边放 `<SoundToggle />`）

**背景：** 现在 `playSfx` 每次新建一个 `GainNode`（0.7）接到 master（0.8），响完也不断开，音量旋钮拧不到正在响的声音。`FakeAudioContext` 没有 `createConvolver`——**总线必须懒创建**（第一次 `playSfx` 时），放进 `createEngine()` 体内会让 12 个引擎测试全挂。

- [ ] **步骤 1：写失败的测试**（`tests/audio/engine.test.ts`）

先给 `FakeAudioContext` 补：`createConvolver()` 返回 `{ buffer: null, connect: (node) => node }` 并把调用次数记在 `this.convolvers` 上；`createGain()` 返回的 `gain` 增加 `setTargetAtTime(value) { this.value = value; }`（照该文件现有 mock 的写法补，不要改已有字段）。然后加：

```ts
describe("反馈音总线", () => {
  it("总线懒创建：只创建一次，混响也只建一次", async () => {
    const engine = await makeEngine();
    const context = lastContext();
    engine.playSfx("correct");
    engine.playSfx("wrong");
    expect(context.convolvers).toBe(1);
  });

  it("setSfxVolume(0) 之后总线增益为 0；总线还没建时先记住音量", async () => {
    const engine = await makeEngine();
    engine.setSfxVolume(0);
    engine.playSfx("correct");
    expect(sfxBusGain(lastContext())).toBe(0);
    engine.setSfxVolume(1);
    expect(sfxBusGain(lastContext())).toBeCloseTo(0.7);
  });
});
```

`lastContext()` / `sfxBusGain()` 是测试内的小辅助：前者拿到最近一个 `FakeAudioContext` 实例（在构造函数里把 `this` 记到模块变量上）；后者在 mock 里找第一个被连到 master 且自身又连了 convolver 的 gain 节点——如果 mock 不记录连线，就让 `createGain` 把节点按顺序 push 到 `this.gains`，并在 engine 里保证总线是 `ensureSfxBus` 里第一个创建的 gain（测试按创建时机定位它）。实现者按 mock 现状选最简单可靠的定位方式，**不要为了测试改引擎的公开 API**。

- [ ] **步骤 2：运行确认失败**

运行：`npx vitest run tests/audio/engine.test.ts`
预期：FAIL，`setSfxVolume` 不存在。

- [ ] **步骤 3：实现引擎**

`MusicEngine` 接口加：

```ts
  /** 反馈音音量，0–1，静音 = 0。立刻作用在正在响的声音上。只管反馈音，不管钢琴和听辨题。 */
  setSfxVolume(volume: number): void;
```

`createEngine()` 内（master 建好之后）：

```ts
  /** 反馈音的基准电平：它是提示，不是内容，比音乐轻一点。 */
  const SFX_LEVEL = 0.7;
  /** 混响湿声的比例：够听出空间，听不出「浴室」。 */
  const REVERB_WET = 0.18;
  let sfxVolume = 1;
  let sfxBus: GainNode | null = null;

  /*
   * 反馈音总线懒创建：第一次播反馈音时才建。
   * 一是它用不上就不该占节点；二是测试的假 AudioContext 只在需要时才要求有 createConvolver。
   * 湿声回到 master，不回到总线——接回总线会回授。
   */
  const ensureSfxBus = (): GainNode => {
    if (sfxBus) return sfxBus;
    const bus = context.createGain();
    bus.gain.value = SFX_LEVEL * sfxVolume;
    bus.connect(master);
    const reverb = createRoomReverb(context);
    const wet = context.createGain();
    wet.gain.value = REVERB_WET;
    bus.connect(reverb);
    reverb.connect(wet);
    wet.connect(master);
    sfxBus = bus;
    return bus;
  };
```

`playSfx` 改成用 `ensureSfxBus()`，不再每次新建 gain。新增方法：

```ts
    setSfxVolume(volume) {
      sfxVolume = Math.min(1, Math.max(0, volume));
      // 用 setTargetAtTime 而不是直接赋值：拖音量条时直接跳值会有咔哒声。
      sfxBus?.gain.setTargetAtTime(SFX_LEVEL * sfxVolume, context.currentTime, 0.015);
    },
```

文件末尾（`createNoise` 旁边）加：

```ts
/**
 * 程序生成的房间混响：白噪声乘一条指数衰减当冲激响应。
 * 不用录好的冲激响应文件——全站零音频资产。
 */
function createRoomReverb(context: AudioContext, seconds = 1.4, decay = 3): ConvolverNode {
  const length = Math.floor(context.sampleRate * seconds);
  const impulse = context.createBuffer(2, length, context.sampleRate);
  for (let channel = 0; channel < 2; channel += 1) {
    const data = impulse.getChannelData(channel);
    for (let index = 0; index < length; index += 1) {
      data[index] = (Math.random() * 2 - 1) * (1 - index / length) ** decay;
    }
  }
  const convolver = context.createConvolver();
  convolver.buffer = impulse;
  return convolver;
}
```

不动：master 的 0.8、`playPump` 自己的总线（不挂混响）。

- [ ] **步骤 4：界面层 store** `src/ui/soundPrefs.ts`

```ts
/**
 * 声音偏好的界面层 store：读写 localStorage，并把音量推给引擎。
 *
 * 引擎是懒创建的（第一次出声才建 AudioContext），
 * 所以除了「改偏好时推一次」，每次播反馈音之前也要推一次——见 useFeedbackSfx。
 */
import { useSyncExternalStore } from "react";
import type { MusicEngine } from "../core/audio/engine.ts";
import { sharedEngine } from "../core/audio/engine.ts";
import {
  SETTINGS_KEY,
  effectiveSfxVolume,
  parseSoundPrefs,
  serializeSoundPrefs,
  type SoundPrefs,
} from "../core/prefs.ts";

const storage = typeof localStorage === "undefined" ? null : localStorage;
let prefs: SoundPrefs = parseSoundPrefs(storage?.getItem(SETTINGS_KEY) ?? null);
const listeners = new Set<() => void>();

export function getSoundPrefs(): SoundPrefs {
  return prefs;
}

export function setSoundPrefs(next: SoundPrefs): void {
  prefs = next;
  storage?.setItem(SETTINGS_KEY, serializeSoundPrefs(next));
  sharedEngine()?.setSfxVolume(effectiveSfxVolume(next));
  for (const listener of listeners) listener();
}

export function applySfxVolume(engine: MusicEngine): void {
  engine.setSfxVolume(effectiveSfxVolume(prefs));
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSoundPrefs(): SoundPrefs {
  return useSyncExternalStore(subscribe, getSoundPrefs);
}
```

- [ ] **步骤 5：`useFeedbackSfx.ts`**

新增一个非 hook 的函数（会话里每题的调可能不同，hook 绑死一个调不够用），两个 hook 改成调它：

```ts
/**
 * 播一条反馈音。必须在点击的同步链路里调用——见文件头。
 * resume 不 await：它本身就是解锁动作，await 了反而会跳出手势。
 */
export function playFeedbackSfx(cue: SfxCue, options: SfxOptions = {}): void {
  const active = sharedEngine();
  if (!active) return;
  void active.resume();
  applySfxVolume(active);
  active.playSfx(cue, options);
}

export function useFeedbackSfx(keyRoot: PitchClass, keyScale: ScaleId) {
  return useCallback(
    (cue: SfxCue, extra: { streak?: number } = {}) => playFeedbackSfx(cue, { keyRoot, keyScale, ...extra }),
    [keyRoot, keyScale],
  );
}
```

`useVerdictSfx` 照旧，只是内部改用 `playFeedbackSfx`。

- [ ] **步骤 6：`src/ui/SoundToggle.tsx`**

```tsx
/**
 * 顶栏的声音开关。
 *
 * 放在 learn / tools 两种模式共有的位置：放进 learn 分支的话，
 * 复习页和工具页里反馈音照响，开关却不见了。
 * 只管反馈音：听辨题的声音是内容，静音不该让题目没法做。
 */
import { Button, Flex, Popover, Slider, Switch, Tooltip } from "antd";
import { setSoundPrefs, useSoundPrefs } from "./soundPrefs.ts";
import { playFeedbackSfx } from "./useFeedbackSfx.ts";

export function SoundToggle() {
  const prefs = useSoundPrefs();
  const content = (
    <Flex vertical gap={12} style={{ width: 200 }}>
      <Flex align="center" justify="space-between">
        <span>反馈音静音</span>
        <Switch
          size="small"
          checked={prefs.sfxMuted}
          onChange={(sfxMuted) => setSoundPrefs({ ...prefs, sfxMuted })}
        />
      </Flex>
      <div>
        <span className="hint">反馈音音量</span>
        <Slider
          min={0}
          max={100}
          value={Math.round(prefs.sfxVolume * 100)}
          disabled={prefs.sfxMuted}
          onChange={(value) => setSoundPrefs({ ...prefs, sfxVolume: value / 100 })}
          // 松手时响一声，让人听见现在多大声。拖动途中不响，否则一串叠在一起。
          onChangeComplete={() => playFeedbackSfx("correct")}
        />
      </div>
      <p className="hint">只管提示音。听辨题和琴键的声音不受影响。</p>
    </Flex>
  );
  return (
    <Popover content={content} trigger="click" placement="bottomRight">
      <Tooltip title="反馈音">
        <Button aria-pressed={prefs.sfxMuted} aria-label={prefs.sfxMuted ? "反馈音已静音" : "反馈音设置"}>
          {prefs.sfxMuted ? "🔇" : "🔊"}
        </Button>
      </Tooltip>
    </Popover>
  );
}
```

`src/App.tsx`：在三元表达式结束（`)}`）之后、键盘 `Tooltip` 之前插入 `<SoundToggle />`。

- [ ] **步骤 7：运行确认通过**

运行：`npm run typecheck; npm test`
预期：全部 PASS。

- [ ] **步骤 8：Commit**

```bash
git add src/core/audio/engine.ts tests/audio/engine.test.ts src/ui/soundPrefs.ts src/ui/useFeedbackSfx.ts src/ui/SoundToggle.tsx src/App.tsx
git commit -m "feat(audio): 常驻反馈音总线，程序生成的混响，顶栏音量与静音"
```

---

### 任务 5：答题会话状态机（纯逻辑）

**文件：**
- 创建：`src/core/lesson/session.ts`
- 测试：`tests/lesson/session.test.ts`

**背景（必须理解）：** `stageEarScore`（`src/core/lesson/stage1.ts`）把 `earAnswers` 里**任何非 null** 都当成「已答」，只有等于正确下标才算对。所以会话里没定稿的题必须保持 `null`；看了答案的题必须存**错下标**（不能改成正确下标、不能改回 null），否则 `earPass` 和 `buildAttempt` 的 `easy` 会被放水。

- [ ] **步骤 1：写失败的测试** `tests/lesson/session.test.ts`

```ts
import { describe, expect, it } from "vitest";
import {
  LESSON_POLICY,
  REVIEW_POLICY,
  canReveal,
  createSession,
  displayOrder,
  sessionReducer,
  sessionSummary,
  solvedSession,
  type SessionAction,
  type SessionPolicy,
  type SessionState,
} from "../../src/core/lesson/session.ts";

const QUESTIONS = [{ correct: 0 }, { correct: 2 }, { correct: 1 }];

function run(actions: SessionAction[], policy: SessionPolicy = LESSON_POLICY): SessionState {
  return actions.reduce(
    (state, action) => sessionReducer(state, action, QUESTIONS, policy),
    createSession(QUESTIONS, 1000),
  );
}

describe("会话：定稿才写 committed", () => {
  it("选了没检查：committed 仍是 null", () => {
    const state = run([{ type: "select", choice: 1 }]);
    expect(state.selected[0]).toBe(1);
    expect(state.committed[0]).toBeNull();
    expect(state.phase[0]).toBe("answering");
  });

  it("检查判错：committed 仍是 null，可以再试", () => {
    const state = run([{ type: "select", choice: 1 }, { type: "check" }]);
    expect(state.phase[0]).toBe("wrong");
    expect(state.committed[0]).toBeNull();
    expect(state.attempts[0]).toBe(1);
  });

  it("检查判对：committed 写入正确下标", () => {
    const state = run([{ type: "select", choice: 0 }, { type: "check" }]);
    expect(state.phase[0]).toBe("correct");
    expect(state.committed[0]).toBe(0);
    expect(state.firstTry[0]).toBe(true);
  });

  it("错过一次再对：算对，但不是第一次就对", () => {
    const state = run([
      { type: "select", choice: 1 },
      { type: "check" },
      { type: "retry" },
      { type: "select", choice: 0 },
      { type: "check" },
    ]);
    expect(state.committed[0]).toBe(0);
    expect(state.firstTry[0]).toBe(false);
  });

  it("判错之后直接选别的项，等于再试一次", () => {
    const state = run([{ type: "select", choice: 1 }, { type: "check" }, { type: "select", choice: 2 }]);
    expect(state.phase[0]).toBe("answering");
    expect(state.selected[0]).toBe(2);
  });
});

describe("会话：看答案", () => {
  it("错不满 revealAfter 次不能看", () => {
    const state = run([{ type: "select", choice: 1 }, { type: "check" }, { type: "reveal" }]);
    expect(state.phase[0]).toBe("wrong");
    expect(canReveal(state, LESSON_POLICY)).toBe(false);
  });

  it("错满两次能看；看了之后 committed 是最后那个错下标，计为错", () => {
    const state = run([
      { type: "select", choice: 1 },
      { type: "check" },
      { type: "select", choice: 2 },
      { type: "check" },
      { type: "reveal" },
    ]);
    expect(state.phase[0]).toBe("revealed");
    expect(state.committed[0]).toBe(2);
    expect(state.committed[0]).not.toBe(QUESTIONS[0].correct);
  });

  it("定稿之后选不动", () => {
    const state = run([{ type: "select", choice: 0 }, { type: "check" }, { type: "select", choice: 1 }]);
    expect(state.selected[0]).toBe(0);
  });
});

describe("会话：复习策略", () => {
  it("错一次就直接亮答案并定稿，不能再试", () => {
    const state = run([{ type: "select", choice: 1 }, { type: "check" }, { type: "retry" }], REVIEW_POLICY);
    expect(state.phase[0]).toBe("revealed");
    expect(state.committed[0]).toBe(1);
  });
});

describe("会话：前进与结束", () => {
  it("没定稿不能前进", () => {
    const state = run([{ type: "select", choice: 1 }, { type: "check" }, { type: "continue", now: 2000 }]);
    expect(state.cursor).toBe(0);
  });

  it("定稿后前进；最后一题前进写 finishedAt，之后什么都不动", () => {
    const state = run([
      { type: "select", choice: 0 }, { type: "check" }, { type: "continue", now: 2000 },
      { type: "select", choice: 2 }, { type: "check" }, { type: "continue", now: 3000 },
      { type: "select", choice: 1 }, { type: "check" }, { type: "continue", now: 9000 },
      { type: "select", choice: 0 },
    ]);
    expect(state.cursor).toBe(2);
    expect(state.finishedAt).toBe(9000);
    expect(state.selected[2]).toBe(1);
  });
});

describe("会话：连对", () => {
  it("判对 +1，判错清零，记住最长", () => {
    const state = run([
      { type: "select", choice: 0 }, { type: "check" }, { type: "continue", now: 1 },
      { type: "select", choice: 2 }, { type: "check" }, { type: "continue", now: 2 },
      { type: "select", choice: 0 }, { type: "check" },
    ]);
    expect(state.streak).toBe(0);
    expect(state.bestStreak).toBe(2);
  });
});

describe("会话：结算", () => {
  it("统计对了几题、第一次就对几题、用时", () => {
    const state = run([
      { type: "select", choice: 0 }, { type: "check" }, { type: "continue", now: 2000 },
      { type: "select", choice: 0 }, { type: "check" }, { type: "select", choice: 1 }, { type: "check" },
      { type: "reveal" }, { type: "continue", now: 3000 },
      { type: "select", choice: 1 }, { type: "check" }, { type: "continue", now: 61000 },
    ]);
    expect(sessionSummary(state, QUESTIONS)).toEqual({
      total: 3,
      correct: 2,
      firstTryCorrect: 2,
      bestStreak: 1,
      seconds: 60,
    });
  });

  it("solvedSession：已完成、全对、全是第一次就对", () => {
    const state = solvedSession(QUESTIONS, 5000);
    expect(state.finishedAt).toBe(5000);
    expect(state.committed).toEqual([0, 2, 1]);
    expect(sessionSummary(state, QUESTIONS).firstTryCorrect).toBe(3);
  });

  it("没有题的会话一创建就算完成", () => {
    expect(createSession([], 7).finishedAt).toBe(7);
  });
});

describe("displayOrder：只洗显示层", () => {
  it("是 0..n-1 的一个排列，同种子稳定", () => {
    const order = displayOrder(4, "7#visit#q1");
    expect([...order].sort()).toEqual([0, 1, 2, 3]);
    expect(displayOrder(4, "7#visit#q1")).toEqual(order);
  });

  it("不同种子大体上会换位置", () => {
    const seen = new Set<string>();
    for (let index = 0; index < 20; index += 1) seen.add(displayOrder(3, `seed-${index}`).join(","));
    expect(seen.size).toBeGreaterThan(1);
  });
});
```

- [ ] **步骤 2：运行确认失败**

运行：`npx vitest run tests/lesson/session.test.ts`
预期：FAIL，模块不存在。

- [ ] **步骤 3：实现** `src/core/lesson/session.ts`

```ts
/**
 * 答题会话的状态机：一题一题地走，「选 → 检查 → 继续」。
 *
 * 纯函数，不 import React、不碰 DOM，测试直接守。
 *
 * 最要紧的一条：只有**定稿**的答案才写进 committed，关卡页再把它原样同步进 earAnswers。
 * stageEarScore 把任何非 null 都当成「已答」，所以：
 * - 判错但还没定稿 → committed 保持 null（不然没检查完的题会被算进分数）
 * - 看了答案 → committed 存最后那个错下标，计为错
 *   （改成正确下标等于放水；改回 null 会让整轮永远「没答完」）
 */
import { shuffleChoices } from "./review.ts";

export type QuestionPhase =
  /** 还没检查，可以改选。 */
  | "answering"
  /** 检查过、错了，可以再试；错满 revealAfter 次可以看答案。 */
  | "wrong"
  /** 检查过、对了，已定稿。 */
  | "correct"
  /** 看了答案，已定稿，计为错。 */
  | "revealed";

export interface SessionPolicy {
  /** 错几次之后允许看答案。 */
  revealAfter: number;
  /** 错了能不能再试。不能的话，判错直接亮答案。 */
  allowRetry: boolean;
}

/** 关卡：两级提示——第一次错只给方向，错满两次才能看答案。 */
export const LESSON_POLICY: SessionPolicy = { revealAfter: 2, allowRetry: true };

/** 复习：一次机会，错了直接亮答案（Leitner 盒按这一次掉档）。 */
export const REVIEW_POLICY: SessionPolicy = { revealAfter: 1, allowRetry: false };

/** 状态机只需要知道每题的正确项。 */
export interface SessionKey {
  correct: number;
}

export interface SessionState {
  cursor: number;
  /** 当前选中，原始下标。 */
  selected: (number | null)[];
  phase: QuestionPhase[];
  /** 每题错了几次。 */
  attempts: number[];
  /** 定稿的答案，原始下标。只有它写进 earAnswers。 */
  committed: (number | null)[];
  /** 第一次检查就对。 */
  firstTry: boolean[];
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

export function isSettled(phase: QuestionPhase | undefined): boolean {
  return phase === "correct" || phase === "revealed";
}

function setAt<T>(items: readonly T[], index: number, value: T): T[] {
  const next = items.slice();
  next[index] = value;
  return next;
}

export function createSession(questions: readonly SessionKey[], now: number): SessionState {
  const count = questions.length;
  return {
    cursor: 0,
    selected: Array.from({ length: count }, () => null),
    phase: Array.from({ length: count }, () => "answering" as const),
    attempts: Array.from({ length: count }, () => 0),
    committed: Array.from({ length: count }, () => null),
    firstTry: Array.from({ length: count }, () => false),
    streak: 0,
    bestStreak: 0,
    startedAt: now,
    finishedAt: count === 0 ? now : null,
  };
}

/** 已掌握的关卡重新打开时：整轮已经做完、全对。 */
export function solvedSession(questions: readonly SessionKey[], now: number): SessionState {
  const answers = questions.map((question) => question.correct);
  return {
    ...createSession(questions, now),
    cursor: Math.max(questions.length - 1, 0),
    selected: answers,
    phase: questions.map(() => "correct" as const),
    committed: answers,
    firstTry: questions.map(() => true),
    finishedAt: now,
  };
}

export function canReveal(state: SessionState, policy: SessionPolicy): boolean {
  const at = state.cursor;
  return state.phase[at] === "wrong" && (state.attempts[at] ?? 0) >= policy.revealAfter;
}

export function sessionReducer(
  state: SessionState,
  action: SessionAction,
  questions: readonly SessionKey[],
  policy: SessionPolicy,
): SessionState {
  if (state.finishedAt !== null) return state;
  const at = state.cursor;
  const question = questions[at];
  if (!question) return state;
  const phase = state.phase[at];

  switch (action.type) {
    case "select": {
      if (isSettled(phase) || action.choice < 0) return state;
      if (phase === "wrong" && !policy.allowRetry) return state;
      return {
        ...state,
        selected: setAt(state.selected, at, action.choice),
        phase: setAt(state.phase, at, "answering"),
      };
    }
    case "check": {
      const choice = state.selected[at];
      if (phase !== "answering" || choice === null || choice === undefined) return state;
      if (choice === question.correct) {
        const streak = state.streak + 1;
        return {
          ...state,
          phase: setAt(state.phase, at, "correct"),
          committed: setAt(state.committed, at, choice),
          firstTry: setAt(state.firstTry, at, (state.attempts[at] ?? 0) === 0),
          streak,
          bestStreak: Math.max(state.bestStreak, streak),
        };
      }
      const attempts = setAt(state.attempts, at, (state.attempts[at] ?? 0) + 1);
      if (!policy.allowRetry) {
        return {
          ...state,
          attempts,
          phase: setAt(state.phase, at, "revealed"),
          committed: setAt(state.committed, at, choice),
          streak: 0,
        };
      }
      return { ...state, attempts, phase: setAt(state.phase, at, "wrong"), streak: 0 };
    }
    case "retry": {
      if (phase !== "wrong" || !policy.allowRetry) return state;
      return {
        ...state,
        phase: setAt(state.phase, at, "answering"),
        selected: setAt(state.selected, at, null),
      };
    }
    case "reveal": {
      if (!canReveal(state, policy)) return state;
      return {
        ...state,
        phase: setAt(state.phase, at, "revealed"),
        committed: setAt(state.committed, at, state.selected[at] ?? null),
      };
    }
    case "continue": {
      if (!isSettled(phase)) return state;
      if (at >= questions.length - 1) return { ...state, finishedAt: action.now };
      return { ...state, cursor: at + 1 };
    }
  }
}

export interface SessionSummary {
  total: number;
  correct: number;
  firstTryCorrect: number;
  bestStreak: number;
  /** 用时（秒，取整）。还没做完是 null。 */
  seconds: number | null;
}

export function sessionSummary(state: SessionState, questions: readonly SessionKey[]): SessionSummary {
  const correct = questions.filter((question, index) => state.committed[index] === question.correct).length;
  return {
    total: questions.length,
    correct,
    firstTryCorrect: state.firstTry.filter(Boolean).length,
    bestStreak: state.bestStreak,
    seconds: state.finishedAt === null ? null : Math.round((state.finishedAt - state.startedAt) / 1000),
  };
}

/**
 * 显示顺序：displayOrder[显示位置] = 原始下标。
 *
 * 只洗显示层。selected / committed 永远存原始下标，
 * earAnswers、配方、复习卡都不用知道洗过牌。
 */
export function displayOrder(choiceCount: number, seed: string): number[] {
  return shuffleChoices(
    Array.from({ length: choiceCount }, (_, index) => index),
    seed,
  );
}
```

- [ ] **步骤 4：运行确认通过**

运行：`npm run typecheck; npm test`
预期：全部 PASS。

- [ ] **步骤 5：Commit**

```bash
git add src/core/lesson/session.ts tests/lesson/session.test.ts
git commit -m "feat(lesson): 答题会话状态机——定稿才写分，看了答案仍算错"
```

---

### 任务 6：会话界面组件群，接进 `LessonFlow`

**文件：**
- 创建：`src/ui/session/QuizSession.tsx`、`SessionProgress.tsx`、`SessionQuestion.tsx`、`CheckSheet.tsx`、`SessionSummary.tsx`、`Confetti.tsx`、`useSessionKeys.ts`、`playOptions.ts`、`session.css`
- 修改：`src/ui/theme.ts`（按压阴影 token）
- 修改：`src/ui/motion.css`（`.m101-press`）
- 修改：`tests/ui/theme.test.ts`（变量定义守卫的扫描范围加上 `src/ui/session/session.css`、`src/ui/path.css`）
- 修改：`src/ui/LessonFlow.tsx`（听辨步）

**依赖：** 任务 1（`springs`、`m`）、任务 2（cue）、任务 4（`playFeedbackSfx`）、任务 5（状态机）。

- [ ] **步骤 1：token 与守卫**

`src/ui/theme.ts` 的 `extras` 里加四个按压阴影色（会被发成 `--m101-press-*`）：

```ts
  /** 可按压按钮的底边阴影：比各自底色深一档。 */
  "press-neutral": "#0b0b10",
  "press-brand": "#b8902a",
  "press-success": "#4f8a32",
  "press-danger": "#b0484b",
```

`tests/ui/theme.test.ts` 里「`var(--m101-…)` 必须定义过」那条，扫描的文件列表加上 `src/ui/session/session.css` 和 `src/ui/path.css`。先运行确认 `path.css` 现状就能过；如果 `path.css` 里有引用了未定义变量的地方，那是现存 bug，修掉它（改成已定义的变量），在 commit message 里写明。

`src/ui/motion.css` 加：

```css
/*
 * 可按压按钮：底边一条阴影，按下去整个按钮下沉、阴影收掉。
 * box-shadow 只触发重绘、不触发布局，不违反「只动 transform / opacity」的本意
 * （那条规矩防的是布局重排）。
 */
.m101-press {
  box-shadow: 0 4px 0 var(--m101-press-neutral);
  transition:
    transform var(--m101-dur-fast) var(--m101-ease-out),
    box-shadow var(--m101-dur-fast) var(--m101-ease-out);
}

.m101-press:active:not(:disabled) {
  transform: translateY(4px);
  box-shadow: 0 0 0 var(--m101-press-neutral);
}
```

- [ ] **步骤 2：`playOptions.ts`**

```ts
/**
 * 依次播一组选项（「都听一遍」、盲听题进题自动播）。
 * 返回取消函数：换题、卸载时要把还没响的掐掉，否则会串到下一题。
 */
import { sharedEngine } from "../../core/audio/engine.ts";

/** 两个选项之间隔多久：跟复习页一致，够把前一个听完。 */
export const OPTION_GAP_MS = 900;

export function playOne(midis: readonly number[]): void {
  const active = sharedEngine();
  if (!active) return;
  void active.resume();
  active.playEarOption(midis);
}

export function playInOrder(options: readonly (readonly number[])[]): () => void {
  const active = sharedEngine();
  if (!active) return () => undefined;
  void active.resume();
  const timers: number[] = [];
  options.forEach((midis, index) => {
    if (index === 0) {
      active.playEarOption(midis);
      return;
    }
    timers.push(window.setTimeout(() => active.playEarOption(midis), OPTION_GAP_MS * index));
  });
  return () => {
    for (const id of timers) window.clearTimeout(id);
  };
}
```

`ReviewDeck` 里现有的 `OPTION_GAP_MS` / `playAll` 在任务 7 改成用这里的。

- [ ] **步骤 3：`useSessionKeys.ts`**

```ts
/**
 * 答题会话的键盘：1–9 选项，Enter 检查 / 继续，Space 重播。
 *
 * 在 window 上监听，自己处理的键一律 preventDefault——
 * 焦点停在按钮上时，浏览器会把 Space / Enter 当成再点一次。
 * 跟弹琴键（A S D F G H J / W E T Y U / Z X）和全局 K 不冲突。
 */
import { useEffect, useRef } from "react";
import { isTypingTarget } from "../../core/lesson/keyboard.ts";

export interface SessionKeyHandlers {
  onDigit: (digit: number) => void;
  onEnter: () => void;
  onSpace: () => void;
}

export function useSessionKeys(enabled: boolean, handlers: SessionKeyHandlers): void {
  // 处理函数每次渲染都换新，用 ref 拿最新的，监听器只装一次。
  const latest = useRef(handlers);
  latest.current = handlers;

  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return;
      if (isTypingTarget(event.target)) return;
      if (/^[1-9]$/.test(event.key)) {
        event.preventDefault();
        latest.current.onDigit(Number(event.key));
      } else if (event.key === "Enter") {
        event.preventDefault();
        latest.current.onEnter();
      } else if (event.key === " ") {
        event.preventDefault();
        latest.current.onSpace();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled]);
}
```

- [ ] **步骤 4：`QuizSession.tsx`（编排）**

数据类型与 props：

```ts
export interface SessionQuestionData {
  id: string;
  prompt: string;
  choices: { label: string; midis: number[] }[];
  correct: number;
  explain: string;
  wrongHint?: string;
  encourage?: string;
  /** 盲听：选项文字检查之后才显示。任务 9 才接，这里先留着字段、按 false 处理。 */
  blind?: boolean;
  /** 复习页每题属于不同关卡，反馈音用题目自己的调。 */
  keyRoot?: PitchClass;
  keyScale?: ScaleId;
}

export interface QuizSessionProps {
  questions: readonly SessionQuestionData[];
  state: SessionState;
  onState: (next: SessionState) => void;
  policy: SessionPolicy;
  /** 显示层洗牌的种子前缀，例如 `${lessonId}#${visitId}`。 */
  seed: string;
  /** 题目已经洗过（复习页）就传 false。 */
  shuffle?: boolean;
  /** 题目自己没写 wrongHint 时的回退提示，通常是这一关的记忆锚。 */
  fallbackHint: string;
  keyRoot: PitchClass;
  keyScale: ScaleId;
  /** 过关线。null = 不显示结算页，最后一题「继续」直接 onFinish。 */
  passMark: number | null;
  onFinish: () => void;
  /** 每题定稿时回调（复习页记盒子）。 */
  onGraded?: (index: number, correct: boolean) => void;
}
```

事件处理（**照抄这几个函数的结构**——音效全在同步链路里，先算新状态、再播音、再 `onState`）：

```ts
/** 连对到这几题时奏一个和弦。 */
const MILESTONES = [5, 10];

const question = questions[state.cursor];
const orders = useMemo(
  () =>
    questions.map((item) =>
      shuffle ? displayOrder(item.choices.length, `${seed}#${item.id}`) : item.choices.map((_, index) => index),
    ),
  [questions, seed, shuffle],
);
const order = orders[state.cursor] ?? [];
const cancelPlayback = useRef<() => void>(() => undefined);
useEffect(() => () => cancelPlayback.current(), []);

const keyOf = (item: SessionQuestionData | undefined) => ({
  keyRoot: item?.keyRoot ?? keyRoot,
  keyScale: item?.keyScale ?? keyScale,
});

const dispatch = (action: SessionAction): SessionState => {
  const next = sessionReducer(state, action, questions, policy);
  if (next !== state) onState(next);
  return next;
};

const select = (original: number) => {
  if (!question) return;
  const next = dispatch({ type: "select", choice: original });
  if (next === state) return;
  cancelPlayback.current();
  const midis = question.choices[original]?.midis ?? [];
  // 选中有声音的选项就播它自己——那是题目内容；没声音才播一声很轻的 select。
  if (midis.length > 0) playOne(midis);
  else playFeedbackSfx("select", keyOf(question));
};

const check = () => {
  const next = dispatch({ type: "check" });
  if (next === state || !question) return;
  const at = state.cursor;
  const phase = next.phase[at];
  if (phase === "correct") {
    playFeedbackSfx("correct", { ...keyOf(question), streak: next.streak });
    if (MILESTONES.includes(next.streak)) playFeedbackSfx("milestone", keyOf(question));
  } else {
    playFeedbackSfx("wrong", keyOf(question));
  }
  if (phase === "correct" || phase === "revealed") onGraded?.(at, phase === "correct");
};

const retry = () => void dispatch({ type: "retry" });

const reveal = () => {
  const next = dispatch({ type: "reveal" });
  if (next !== state) onGraded?.(state.cursor, false);
};

const advance = () => {
  const next = dispatch({ type: "continue", now: Date.now() });
  if (next === state) return;
  cancelPlayback.current();
  if (next.finishedAt !== null) {
    if (passMark === null) {
      onFinish();
      return;
    }
    if (sessionSummary(next, questions).correct >= passMark) playFeedbackSfx("pass", keyOf(question));
    return;
  }
  const upcoming = questions[next.cursor];
  // 盲听题进题自动播一遍：必须在这次点击里启动，放进 effect 第一题会静音。
  if (upcoming?.blind) {
    cancelPlayback.current = playInOrder((orders[next.cursor] ?? []).map((original) => upcoming.choices[original]?.midis ?? []));
  }
};

const playAll = () => {
  if (!question) return;
  cancelPlayback.current();
  cancelPlayback.current = playInOrder(order.map((original) => question.choices[original]?.midis ?? []));
};

const finished = state.finishedAt !== null;
const phase = state.phase[state.cursor] ?? "answering";
useSessionKeys(!finished, {
  onDigit: (digit) => {
    const original = order[digit - 1];
    if (original !== undefined) select(original);
  },
  onEnter: () => {
    if (phase === "answering") check();
    else if (phase === "wrong") retry();
    else advance();
  },
  onSpace: () => {
    const chosen = state.selected[state.cursor];
    if (chosen !== null && chosen !== undefined && question) playOne(question.choices[chosen]?.midis ?? []);
    else playAll();
  },
});
```

渲染：

```tsx
if (finished && passMark !== null) {
  return (
    <SessionSummary
      summary={sessionSummary(state, questions)}
      passMark={passMark}
      onRedo={() => onState(createSession(questions, Date.now()))}
      onContinue={onFinish}
    />
  );
}
if (!question) return null;
return (
  <div className="quiz-session">
    <SessionProgress done={state.phase.filter(isSettled).length} total={questions.length} streak={state.streak} />
    <AnimatePresence mode="wait" initial={false}>
      <m.div
        key={question.id}
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -24 }}
        transition={springs.base}
      >
        <SessionQuestion
          question={question}
          order={order}
          selected={state.selected[state.cursor] ?? null}
          phase={phase}
          onSelect={select}
          onPlay={(original) => playOne(question.choices[original]?.midis ?? [])}
          onPlayAll={playAll}
        />
      </m.div>
    </AnimatePresence>
    <CheckSheet
      phase={phase}
      canCheck={state.selected[state.cursor] !== null}
      canReveal={canReveal(state, policy)}
      allowRetry={policy.allowRetry}
      seed={state.cursor}
      encourage={question.encourage}
      hint={question.wrongHint ?? fallbackHint}
      answerLabel={question.choices[question.correct]?.label ?? ""}
      explanation={question.explain}
      onCheck={check}
      onRetry={retry}
      onReveal={reveal}
      onContinue={advance}
    />
  </div>
);
```

- [ ] **步骤 5：子组件的硬性要求**

`SessionProgress.tsx`
- 一条进度条：外框 + 内条，内条用 `m.div` 动 `scaleX`（`transformOrigin: "left"`，`done / total`，`springs.base`），**不动 width**
- 右侧「`done` / `total`」
- `streak >= 2` 时显示「连对 ×N」：`m.span`，`key={streak}` 让每次加一都重新进场（`initial={{ scale: 1.25 }} animate={{ scale: 1 }}`，`springs.snappy`）；`streak >= 5` 加 class `is-hot`（金色 + 一圈光晕）
- 无障碍：进度条 `role="progressbar"` + `aria-valuenow/min/max`

`SessionQuestion.tsx`
- 题干 `<h2 className="result-heading">`
- 右上「▶ 都听一遍」按钮 → `onPlayAll`
- 选项按 `order` 渲染：原生 `<button className="session-option m101-press is-…">`，左侧数字角标 `1/2/3`（就是键盘快捷键），中间文字，右侧小「▶」按钮（`stopPropagation`，调 `onPlay(original)`）
- 状态 class：选中 = `is-selected`；`phase` 为 `correct` 时选中项 `is-correct`；`wrong` 时选中项 `is-wrong`；`revealed` 时选中项 `is-wrong`、正确项 `is-correct`
- 定稿后（`correct` / `revealed`）整组 `disabled`
- `role="radiogroup"` / `role="radio"` / `aria-checked`；判定结果加 `.sr-only` 的「答对了 / 答错了」
- 判对时选项 `m.button` 做 `whileTap={{ scale: 0.98 }}`；对 / 错的弹跳与抖动复用 `motion.css` 现有的 `m101-pop` / `m101-shake`（通过 class 触发），不再在 JS 里写一份

`CheckSheet.tsx`
- 固定在会话区底部（`position: sticky; bottom: 0`），不是整页 `fixed`
- `phase === "answering"`：一条安静的底栏，右侧「检查」大按钮（`m101-press`，品牌色），没选中时 `disabled`
- 其它 phase：`AnimatePresence` 里一个 `m.div`，`initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}`，`springs.snappy`，`role="status"`
  - `correct`：绿底，标题 `encourage ?? praiseLine(seed)`，正文 `explanation`，按钮「继续」
  - `wrong`：红底，标题 `retryLine(seed)`，正文 `hint`（**不给答案**），按钮「再试一次」（`allowRetry` 时）+「看答案」（仅 `canReveal`）
  - `revealed`：红底，标题「正确答案：{answerLabel}」，正文 `explanation`，按钮「继续」
- 按钮上标出快捷键提示（「检查 · Enter」）
- `praiseLine` / `retryLine` 来自 `src/core/lesson/copy.ts`

`SessionSummary.tsx`
- 三个数字：第一次就对 `firstTryCorrect / total`、最长连对 `bestStreak`、用时 `m:ss`。数字从 0 跑到终值：用 `motion/react` 的 `animate(0, value, { ...springs.soft, onUpdate })` 写一个小 hook `useCountUp`；`useReducedMotion()` 为真时直接显示终值
- `correct >= passMark`：复用 `.pass-stamp` 盖章「听辨通过」+ `<Confetti />`；否则「还差 {passMark - correct} 题」
- 按钮：「继续」（`m101-press`，品牌色）→ `onContinue`；「重做这一轮」→ `onRedo`

`Confetti.tsx`
- 绝对定位、`pointer-events: none` 的 `<canvas>`，盖在结算卡上
- 约 60 片，从卡片上方中线喷出：初速度随机（向上 + 左右散开），重力 + 空气阻力，边转边落，1.2 秒后停帧并清空
- 颜色取 `palette.brand` / `palette.accent` / `palette.success`
- `window.matchMedia("(prefers-reduced-motion: reduce)").matches` 为真时返回 `null`
- 卸载时 `cancelAnimationFrame`

`session.css`
- 只用 `var(--m101-*)`；不写 `#ffd666` / `#ff7875` / `#95de64` 字面值
- `.session-option` 比现有 `.quiz-option` 大一号：`padding: 14px 16px`、字号 1rem、数字角标是圆角小方块
- `.session-option.m101-press` 在 `is-correct` / `is-wrong` / `is-selected` 时分别换 `--m101-press-success` / `--m101-press-danger` / `--m101-press-brand`
- 判定条绿 / 红底用 `--m101-success-soft` / `--m101-danger-soft`，左边一条 4px 实色边
- `.session-streak.is-hot` 金色字 + `box-shadow` 光晕
- 在 `QuizSession.tsx` 顶部 `import "./session.css";`

- [ ] **步骤 6：接进 `LessonFlow.tsx`**

- 新状态：`const [earSession, setEarSession] = useState(() => createSession(lesson.ear, Date.now()));`
- 换关重置：在已有的 `useEffect(() => { setStep(0); setState(emptyStageState(lesson)); … }, [lesson.id])` 里加 `setEarSession(createSession(lesson.ear, Date.now()));`
- `step === 1` 的 `<Card title="听辨">` 里，把提示文案改成「一题一题来：选好了点检查（或按 Enter）。数字键 1、2、3 选选项，空格重播。」，`<EarQuiz …/>` 换成：

```tsx
<QuizSession
  questions={lesson.ear}
  state={earSession}
  onState={(next) => {
    setEarSession(next);
    // 只同步定稿的答案：没检查完的题保持 null，评分和结算一行不改。
    setState((current) => ({ ...current, earAnswers: next.committed }));
  }}
  policy={LESSON_POLICY}
  seed={visitId.current}
  fallbackHint={anchorHint(lesson.anchor.name, lesson.anchor.hook)}
  keyRoot={lesson.keyRoot}
  keyScale={lesson.keyScale}
  passMark={lesson.earPass}
  onFinish={() => setStep(2)}
/>
```

- **不动**：结算 effect（`step < 3 && !passed` 守卫、首帧只 `recordVisit` 的 early return）、`stageEarScore`、`diagnoseStage`
- 删掉对 `EarQuiz` 的 import（文件本身任务 7 再删）

- [ ] **步骤 7：运行确认通过**

运行：`npm run typecheck; npm test`
预期：全部 PASS。

- [ ] **步骤 8：浏览器冒烟**

dev server 已经在 `http://localhost:5199/` 跑着（没跑就 `npx vite --port 5199 --strictPort` 后台起一个）。进第 2 关 → 听辨：
- 一次只显示一题；选一项会响它自己的声音；「检查」从灰变可点
- 故意答错：红色判定条从底部升起，只给方向；「看答案」不出现；再错一次才出现；点了之后正确项变绿、选项锁死
- 答对：绿条 + 上行音；连对 ≥ 2 出现「连对 ×N」
- 键盘 1/2/3、Enter、Space 生效
- 做完 8 题出现结算页；过线时盖章 + 彩带
- 「继续」进到手做步；回到听辨步仍是结算页
- 诊断步的听辨分数跟你答的一致

截图存到 `C:\Users\bubbl\AppData\Local\Temp\cursor\screenshots\`，在报告里给出路径。

- [ ] **步骤 9：Commit**

```bash
git add src/ui/session src/ui/theme.ts src/ui/motion.css tests/ui/theme.test.ts src/ui/LessonFlow.tsx
git commit -m "feat(ui): 一题一题的答题会话——检查、判定条、连对、结算与彩带"
```

---

### 任务 7：第 1 关和复习页也换成会话，删掉旧组件

**文件：**
- 修改：`src/ui/LessonOne.tsx`
- 修改：`src/ui/ReviewDeck.tsx`
- 删除：`src/ui/EarQuiz.tsx`、`src/ui/QuizFeedback.tsx`（先 `rg "EarQuiz|QuizFeedback" src` 确认没有别的引用）

- [ ] **步骤 1：`LessonOne.tsx`**

- 新状态 `earSession`：已掌握时用 `solvedSession(questions, Date.now())`（跟现在 `solvedLevel1()` 预填全对的逻辑一致），否则 `createSession`
- 题目映射时**补上** `wrongHint` / `encourage`（现在的适配器把它们丢了，内容里其实有）：

```ts
const LEVEL1_QUESTIONS: SessionQuestionData[] = LEVEL1_EAR.map((question) => ({
  id: question.id,
  prompt: question.prompt,
  choices: question.choices.map((choice) => ({ label: choice.label, midis: [choice.midi] })),
  correct: question.correct,
  explain: question.explain,
  wrongHint: question.wrongHint,
  encourage: question.encourage,
}));
```

（放在组件外面，模块级常量。）
- `QuizSession` 的 props 跟任务 6 的 `LessonFlow` 一样，`seed` 用 `visitId.current`，`passMark={LEVEL1_EAR_PASS}`，`keyRoot={0}` `keyScale="major"`，`onFinish={() => setStep(2)}`
- 提示文案改成跟 `LessonFlow` 同一句
- 结算 effect 不动

- [ ] **步骤 2：`ReviewDeck.tsx`**

语义：一关一题、一次机会（`REVIEW_POLICY`）、**在点「检查」时**调用 `gradeReview`（以前是点选项时），Leitner 升降规则不变。

- `start()`：把到期关卡逐个 `reviewQuestionFor(levelId, card?.round ?? 0)`，丢掉 `null`，组成 `items: { levelId: number; question: SessionQuestionData }[]`。题目已经被 `reviewQuestionFor` 洗过，所以 `shuffle={false}`。每题带上所属关卡的 `keyRoot` / `keyScale`（标准关从 `lessonById` 取，第 1 关 C 大调），`wrongHint` 缺省时用 `anchorHint(question.anchorName, question.anchorHook)`
- 会话状态 `reviewSession`，`start()` 时 `createSession`
- `onGraded={(index, correct) => { setResults(...); onProgress((value) => gradeReview(value, { levelId: items[index].levelId, correct, now: Date.now() })); }}`
- `passMark={null}`，`onFinish` 时清空队列，显示现有的「今天的复习做完了」卡片（那段 JSX 不动）
- 删掉 `picked` / `showAnswer` / `pick` / `next` / `loadQuestion` / 自己的 `playAll` 和 timers（改用 `playOptions.ts`）
- 到期列表页、空状态页不动

- [ ] **步骤 3：删旧组件**

```bash
rg "EarQuiz|QuizFeedback" src
```

预期：只剩这两个文件自己。然后删除它们。`QuizOption.tsx` 的 `QuizGroup` 手做步还在用，**不删**。

- [ ] **步骤 4：运行确认通过**

运行：`npm run typecheck; npm test`
预期：全部 PASS（`tests/lesson/review.test.ts` 的 `reviewQuestionFor` / `gradeReviewCard` 断言不变）。

- [ ] **步骤 5：浏览器冒烟**

- 第 1 关听辨走一遍；答错时显示的是这一题自己的 `wrongHint`，不是整关锚点
- 复习页：需要有到期卡片。在浏览器 devtools 里把 `music-101.progress` 的 `reviews` 改出一张 `dueAt: 0` 的卡（或者先通过第 2 关再进复习，第一次过关会建一张今天到期的卡）。走一题：错一次直接亮答案；结束显示「今天的复习做完了」

- [ ] **步骤 6：Commit**

```bash
git add -A src/ui
git commit -m "feat(ui): 第 1 关与复习页换成答题会话，删掉 EarQuiz / QuizFeedback"
```

---

### 任务 8：View Transition 导航与共享元素

**文件：**
- 修改：`src/App.tsx`
- 创建：`src/ui/LessonHeader.tsx`
- 修改：`src/ui/PathMap.tsx`
- 修改：`src/ui/LessonFlow.tsx`、`src/ui/LessonOne.tsx`（放 `LessonHeader`；切步骤包 `startTransition`）
- 修改：`src/ui/motion.css`（View Transition 动效）

- [ ] **步骤 1：`App.tsx` 的导航**

```ts
import { ViewTransition, addTransitionType, startTransition } from "react";

/** 页面切换的方向：决定新页从哪边进来。 */
type NavDirection = "forward" | "back" | "swap";

/**
 * View Transition 只对 startTransition 里的更新生效。
 * 所有换页都走这里，漏一个那条路径就没有动画。
 */
const navigate = (update: () => void, direction: NavDirection = "swap") =>
  startTransition(() => {
    addTransitionType(direction);
    update();
  });
```

逐个改：`openLevel` → `"forward"`；`backToPath` → `"back"`；关卡下拉 `onChange`、「复习」、「工具」、「学习路径」、五个工具子页按钮、`ProgressBoard` 的 `onOpenReview` / `onApply` → `"swap"`（`onApply` 进关卡用 `"forward"`）。

内容区包一层，`key` 决定「这是不是换了一页」：

```tsx
const pageKey = mode === "tools" ? `tools-${toolView}` : learnView === "lesson" ? `lesson-${level}` : "path";

<Content className="bench">
  <ViewTransition
    key={pageKey}
    enter={{ forward: "m101-page-forward", back: "m101-page-back", default: "auto" }}
    exit={{ forward: "m101-page-forward", back: "m101-page-back", default: "auto" }}
  >
    <div>{/* 原来那棵三元树 */}</div>
  </ViewTransition>
</Content>
```

（`enter` / `exit` 按 transition type 选 class 的写法以 `node_modules/@types/react/index.d.ts` 里 `ViewTransitionProps` 为准；如果签名不同，照类型定义改，保持「forward / back 各一套 class、其余默认交叉淡入」的语义。）`KeyboardPanel` 在树外，不包。

- [ ] **步骤 2：`motion.css` 的页面动效**

```css
/* —— 页面切换（View Transition） —— */

@keyframes m101-page-in-up {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes m101-page-out-up {
  from { opacity: 1; transform: translateY(0); }
  to { opacity: 0; transform: translateY(-8px); }
}

::view-transition-new(.m101-page-forward) {
  animation: m101-page-in-up var(--m101-dur-slow) var(--m101-ease-out);
}
::view-transition-old(.m101-page-forward) {
  animation: m101-page-out-up var(--m101-dur-base) var(--m101-ease-out);
}
::view-transition-new(.m101-page-back) {
  animation: m101-page-in-up var(--m101-dur-slow) var(--m101-ease-out) reverse;
}
::view-transition-old(.m101-page-back) {
  animation: m101-page-out-up var(--m101-dur-base) var(--m101-ease-out) reverse;
}
::view-transition-group(*) {
  animation-duration: var(--m101-dur-slow);
  animation-timing-function: var(--m101-ease-out);
}
```

（任务 1 加的 reduced-motion 降级已经覆盖这些伪元素。）

- [ ] **步骤 3：`LessonHeader.tsx`（共享元素的目标）**

```tsx
/**
 * 关卡页顶部的标题，整个关卡生命周期都在。
 *
 * 它是路径节点标题的共享元素目标：点节点进关时，节点上的标题「飞」成这里的标题。
 * 原来的标题只在第 0 步的 antd Card title 里——切到别的步骤就没了，
 * 而且 antd 的字符串 title 包不进 ViewTransition。
 */
import { ViewTransition } from "react";

export function levelTitleTransitionName(levelId: number): string {
  return `level-title-${levelId}`;
}

export function LessonHeader({ levelId, title }: { levelId: number; title: string }) {
  return (
    <header className="lesson-header">
      <span className="lesson-header-number">第 {levelId} 关</span>
      <ViewTransition name={levelTitleTransitionName(levelId)}>
        <h2 className="lesson-header-title">{title}</h2>
      </ViewTransition>
    </header>
  );
}
```

样式加在 `src/styles.css`（只用 `var(--m101-*)`）：标题 1.5rem、粗体，关号小号 `--m101-text-dim`。

- [ ] **步骤 4：两端接上**

- `PathMap.tsx`：`<span className="path-node-name">{node.title}</span>` 包进 `<ViewTransition name={levelTitleTransitionName(node.id)}>`
- `LessonFlow.tsx`：在 `<Steps>` 之前放 `<LessonHeader levelId={lesson.id} title={lesson.title} />`；`step === 0` 的 `<Card title={lesson.title}>` 改成 `<Card title="概念">`（标题已经在上面了）；`<p className="hint">第 {lesson.id} 关 · {lesson.title}。…` 去掉关号和标题前缀，只留键位说明
- `LessonOne.tsx`：同样放 `<LessonHeader levelId={1} title={…} />`，标题从 `lessonById(1)?.title ?? "音高与键盘"` 取；第 0 步的 `<Card title="音高与键盘">` 改成 `<Card title="概念">`
- 两个关卡组件里切步骤的地方（`Steps onChange`、「上一步」「下一步」、会话的 `onFinish`）都包 `startTransition(() => setStep(…))`，得到默认交叉淡入

- [ ] **步骤 5：运行确认通过**

运行：`npm run typecheck; npm test`
预期：全部 PASS。

- [ ] **步骤 6：浏览器冒烟**

- 路径图点第 3 关：节点标题飞到关卡页顶部，新页从下往上浮入
- 「返回路径」：反向
- 工具页之间切：交叉淡入
- 关卡里切步骤：交叉淡入，标题不动
- 用 CDP `Emulation.setEmulatedMedia`（`features: [{ name: "prefers-reduced-motion", value: "reduce" }]`）打开减少动态效果：上面这些都没有动画，功能照常；做完 `Emulation.setEmulatedMedia` 清掉

- [ ] **步骤 7：Commit**

```bash
git add src/App.tsx src/ui/LessonHeader.tsx src/ui/PathMap.tsx src/ui/LessonFlow.tsx src/ui/LessonOne.tsx src/ui/motion.css src/styles.css
git commit -m "feat(ui): View Transition 换页，路径节点标题飞成关卡标题"
```

---

### 任务 9：盲听

**文件：**
- 修改：`src/content/types.ts`（`StageEar` 加 `blind?: boolean`）
- 修改：`tests/lesson/ear-feedback.test.ts`
- 修改：`src/ui/session/SessionQuestion.tsx`、`src/ui/session/CheckSheet.tsx`（如需）
- 修改：2–8 关、14–17 关中合格题目所在的 `src/content/lessons/level-NN.ts`

- [ ] **步骤 1：写失败的测试**（追加到 `tests/lesson/ear-feedback.test.ts`）

```ts
describe("盲听题", () => {
  const blind = FLOW_LESSONS.flatMap((lesson) =>
    lesson.ear.filter((question) => question.blind).map((question) => ({ lesson, question })),
  );

  it("至少开了一批", () => {
    expect(blind.length).toBeGreaterThanOrEqual(10);
  });

  it("选项的声音两两不同——否则盲听等于瞎猜", () => {
    for (const { lesson, question } of blind) {
      const sounds = question.choices.map((choice) => JSON.stringify(choice.midis));
      expect(new Set(sounds).size, `第 ${lesson.id} 关 ${question.id}`).toBe(sounds.length);
    }
  });

  it("只在 2–8 关和 14–17 关开：阶段二、三别处的 midis 是层数编码，不是真音高", () => {
    for (const { lesson, question } of blind) {
      const ok = (lesson.id >= 2 && lesson.id <= 8) || (lesson.id >= 14 && lesson.id <= 17);
      expect(ok, `第 ${lesson.id} 关 ${question.id}`).toBe(true);
    }
  });
});
```

- [ ] **步骤 2：运行确认失败**

运行：`npx vitest run tests/lesson/ear-feedback.test.ts`
预期：FAIL（`blind` 不存在 / 数量是 0）。

- [ ] **步骤 3：类型**

`src/content/types.ts` 的 `StageEar`：

```ts
  /**
   * 盲听：选项文字等检查之后才显示，只能靠耳朵分。
   *
   * 只给「选项文字就是这个声音本身的名字」的题开（音名、和弦名、进行名），
   * 而且选项的声音必须两两不同——守卫在 tests/lesson/ear-feedback.test.ts。
   */
  blind?: boolean;
```

- [ ] **步骤 4：挑题打开**

逐题读 2–8 关、14–17 关的听辨题，同时满足下面三条才加 `blind: true`：
1. 题干在问「哪一个声音是 X」（哪一对是半音、哪个是大三和弦、哪一对是解决……）
2. 选项文字是这个声音本身的名字（`C4 → C♯4`、`C E G`、`G → C`），不是数量（「2 个」）、不是判断（「在 / 不在」）、不是情绪词
3. 选项的 `midis` 两两不同，而且是真音高

手写题（2–8 关）直接在对象里加字段；`ear()` 模板题（14–17 关）在第 9 个参数 `feedback` 对象旁边——`ear()` 现在不认 `blind`，给 `EarFeedback` 加一个可选 `blind?: boolean` 并在 `ear()` 返回值里透传。

在报告里列出你打开的每一题（关号 + id + 一句理由），以及你看过但没开的典型例子各一条。

- [ ] **步骤 5：界面**

`SessionQuestion.tsx`，当 `question.blind` 且 `phase` 不是 `correct` / `revealed`：
- 选项块显示 `A` / `B` / `C`（按显示位置）+ 一个播放图标，**文字不进 DOM**；按钮的无障碍名字是「选项 A」
- 题干右边一个「盲听」小标签（`Tag` 或自写 class 都行）
- 定稿之后文字淡入（`m.span`，`initial={{ opacity: 0 }} animate={{ opacity: 1 }}`）

`CheckSheet` 在 `wrong` 状态下的 `hint` 是方法不是答案，盲听题照样适用，不用改。

第一题如果是盲听题，进题不会自动播（没有点击可以挂靠），题干下方显示「先点 ▶ 都听一遍，或按空格」。

- [ ] **步骤 6：运行确认通过**

运行：`npm run typecheck; npm test`
预期：全部 PASS。

- [ ] **步骤 7：浏览器冒烟**

找一关有盲听题的走一遍：检查前选项上看不到答案文字（用 CDP `Runtime.evaluate` 读 `.quiz-session` 的 `innerText`，确认不包含正确项的 label）；检查后文字出现；从上一题「继续」进到盲听题时自动播一遍。

- [ ] **步骤 8：Commit**

```bash
git add src/content src/ui/session tests/lesson/ear-feedback.test.ts
git commit -m "feat(content): 盲听题——检查前不显示选项文字，只能靠耳朵分"
```

---

## 收尾（控制者执行，不派实现者）

1. 派一个 browser-use 子代理，按规格 §6 的浏览器实跑清单完整走一遍，截图
2. 派一个最终审查子代理，审整条分支（`git diff main...HEAD`）
3. 用 finishing-a-development-branch 收尾
