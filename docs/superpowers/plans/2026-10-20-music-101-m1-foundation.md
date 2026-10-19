# M1 地基 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 搭起 Music-101 的项目脚手架，实现纯函数的 `core/theory`（音高/音程/音阶/和弦/级数）与 `core/midi`（MIDI 读写 + 骨架转换），并产出一个能被 Cubase 13 正确导入的演示 MIDI 文件。

**架构：** `src/core/` 下全是纯函数模块（不接触 DOM、不接触 Web Audio），因此可被 Vitest 完整覆盖，也可在 Node 与浏览器两端复用。`scripts/make-test-midi.ts` 用 Node 24 原生的 TypeScript 类型剥离直接运行，零额外依赖，产出的 `.mid` 用作 Cubase 实机验证的输入。

**技术栈：** Vite + React 19 + TypeScript 5（`verbatimModuleSyntax` + `allowImportingTsExtensions`），Vitest 3，Node 24。

**规格来源：** `docs/superpowers/specs/2026-10-20-music-101-design.md`（对应其"第 8 节 交付阶段"中的 M1）

---

## 范围边界

**本计划只做 M1。** M2（声音引擎 + 任务 UI + 16 格步进器）、M3（诊断引擎）、M4–M6（课程内容与参考曲分析）各自独立成计划。

M1 的完成标准（来自规格）：**单测通过；生成一个 .mid 能在 Cubase 13 导入并显示正确轨名/tempo。**

## 关键技术决策：MIDI meta 0x06 的冲突

标准 MIDI 文件（SMF）里：

| meta type | 标准含义 | MMA 扩展含义 |
|---|---|---|
| `0x06` | **Marker**（标记，文本） | **Chord Name**（根音 + 性质 + 文本） |

两者**共用同一个 meta type**，在同一个文件里无法无歧义地区分——一个 DAW 无法同时把 `FF 06` 读成标记和和弦。

**M1 的决定：只写 Marker，不写 Chord meta 事件。**

- 段落结构 → Marker（`Intro` / `Verse` / `PreChorus` / `Chorus`）
- 每个和弦 → 在它起始 tick 上再写一个 Marker，文本是和弦名（如 `F#m`）；同时在 `CHORDS` 轨上写出该和弦的三个实际音高

这正是规格 3.7 里写明的**降级方案**（"纯音符轨 + 级数标注"）。MMA Chord Name 事件的兼容性留到 M5 单独验证——那时可以产出一个只含和弦事件的文件来隔离测试。

## 全局约定

1. **所有相对导入必须带 `.ts` 扩展名**（`import { x } from "./pitch.ts"`）。原因：脚本要用 `node scripts/xxx.ts` 直接跑，Node 的类型剥离要求显式扩展名；Vite 与 Vitest 都能正确解析显式 `.ts`。
2. **类型导入一律用 `import type`**，因为 `tsconfig` 开了 `verbatimModuleSyntax`，且 Node 类型剥离不做类型擦除。
3. **不使用 `enum` / `namespace` / 参数属性**，这些语法无法被 Node 类型剥离擦除。一律用 `type` + `const` 对象。
4. **分层依赖单向**：`core/midi` **不依赖** `core/theory`。领域数据（和弦音高）由调用方算好再传进来。
5. 每个任务结束提交一次，commit message 用 Conventional Commits。
6. 全量测试命令：`npm test`（等价 `npx vitest run`）。单文件：`npx vitest run tests/theory/pitch.test.ts`。
7. 本计划在 `main` 分支直接执行——仓库是全新项目且专用于本产品，暂不另开 worktree。

---

## 文件结构

**任务 1 创建（工具链）**

| 文件 | 职责 |
|---|---|
| `package.json` | 依赖与脚本 |
| `tsconfig.json` | 类型检查配置 |
| `vite.config.ts` | Vite + Vitest 配置 |
| `index.html` | Vite 入口 HTML |
| `src/main.tsx` | React 挂载 |
| `src/App.tsx` | 最小外壳（任务 9 再接 theory） |
| `src/styles.css` | 最小样式 |

**任务 2–4 创建（core/theory）**

| 文件 | 职责 |
|---|---|
| `src/core/theory/pitch.ts` | 音名 / 音级 / MIDI 音高互转、频率换算 |
| `src/core/theory/interval.ts` | 音程表与协和度评分 |
| `src/core/theory/scale.ts` | 音阶、调、调内判定、级数 |
| `src/core/theory/chord.ts` | 和弦模板、和弦匹配、罗马数字级数 |
| `src/core/theory/index.ts` | 桶文件 |

**任务 5–7 创建（core/midi）**

| 文件 | 职责 |
|---|---|
| `src/core/midi/types.ts` | `MidiEvent` / `MidiTrack` / `MidiFile` 类型与 `PPQ` |
| `src/core/midi/writer.ts` | SMF 格式 1 写出（VLQ、meta 事件、轨块） |
| `src/core/midi/reader.ts` | SMF 读入（running status、meta 事件） |
| `src/core/midi/project.ts` | `SongSkeleton` → `MidiFile` 的领域转换 |
| `src/core/midi/index.ts` | 桶文件 |

**任务 8–9 创建（脚本与出口）**

| 文件 | 职责 |
|---|---|
| `src/core/index.ts` | core 总桶文件 |
| `scripts/make-test-midi.ts` | 生成 `out/music101-test.mid` |

**测试**

| 文件 | 覆盖 |
|---|---|
| `tests/theory/pitch.test.ts` | 音名互转 |
| `tests/theory/interval.test.ts` | 音程 |
| `tests/theory/scale.test.ts` | 音阶与调内判定 |
| `tests/theory/chord.test.ts` | 和弦匹配与级数 |
| `tests/midi/writer.test.ts` | 头部与 VLQ 编码 |
| `tests/midi/reader.test.ts` | 读入 |
| `tests/midi/roundtrip.test.ts` | 写出→读入逐字段相等 |
| `tests/midi/project.test.ts` | 骨架转换 |

---

## 任务 1：项目脚手架与工具链

**文件：**
- 创建：`package.json`
- 创建：`tsconfig.json`
- 创建：`vite.config.ts`
- 创建：`index.html`
- 创建：`src/main.tsx`
- 创建：`src/App.tsx`
- 创建：`src/styles.css`

- [ ] **步骤 1：写 `package.json`**

```json
{
  "name": "music-101",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "make:midi": "node scripts/make-test-midi.ts"
  }
}
```

- [ ] **步骤 2：写 `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "resolveJsonModule": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "skipLibCheck": true,
    "types": ["vite/client", "node"]
  },
  "include": ["src", "tests", "scripts", "vite.config.ts"]
}
```

- [ ] **步骤 3：写 `vite.config.ts`**

```ts
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
```

- [ ] **步骤 4：写 `index.html`**

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Music-101</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **步骤 5：写 `src/main.tsx`**

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import "./styles.css";

const container = document.getElementById("root");
if (!container) throw new Error("找不到 #root 挂载点");

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **步骤 6：写 `src/App.tsx`（本任务先放最小占位，任务 9 再接 theory）**

```tsx
export function App() {
  return (
    <main>
      <h1>Music-101</h1>
      <p>kawaii bass / future bass 编曲速成 —— M1 地基</p>
    </main>
  );
}
```

- [ ] **步骤 7：写 `src/styles.css`**

```css
:root {
  color-scheme: dark;
  font-family: system-ui, -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif;
  background: #12121a;
  color: #ececf3;
}

body {
  margin: 0;
}

main {
  max-width: 60rem;
  margin: 0 auto;
  padding: 2rem;
}
```

- [ ] **步骤 8：安装依赖**

运行：

```bash
npm install react react-dom
npm install -D typescript vite @vitejs/plugin-react vitest @types/react @types/react-dom @types/node
```

预期：两条命令都成功退出，`package.json` 里出现 `dependencies` 与 `devDependencies`，生成 `package-lock.json` 与 `node_modules/`。

- [ ] **步骤 9：类型检查通过**

运行：`npm run typecheck`
预期：退出码 0，无输出。

- [ ] **步骤 10：构建通过**

运行：`npm run build`
预期：退出码 0，出现 `✓ built in ...` 与 `dist/index.html`。

- [ ] **步骤 11：Commit**

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts index.html src/ .gitignore
git commit -m "chore: scaffold Music-101 web app with Vite + React + TypeScript"
```

---

## 任务 2：core/theory — 音高与音程

**文件：**
- 创建：`src/core/theory/pitch.ts`
- 创建：`src/core/theory/interval.ts`
- 创建：`tests/theory/pitch.test.ts`
- 创建：`tests/theory/interval.test.ts`

- [ ] **步骤 1：写失败的测试 `tests/theory/pitch.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import {
  isBlackKey,
  midiToFrequency,
  midiToNoteName,
  midiToPitchClass,
  noteNameToMidi,
  pitchClassToName,
} from "../../src/core/theory/pitch.ts";

describe("midiToPitchClass", () => {
  it("把 MIDI 音高映射到 0-11 音级", () => {
    expect(midiToPitchClass(60)).toBe(0);
    expect(midiToPitchClass(61)).toBe(1);
    expect(midiToPitchClass(69)).toBe(9);
    expect(midiToPitchClass(72)).toBe(0);
  });

  it("负音高也正确取模", () => {
    expect(midiToPitchClass(-1)).toBe(11);
    expect(midiToPitchClass(-13)).toBe(11);
  });
});

describe("midiToNoteName", () => {
  it("用科学音高记法，MIDI 60 = C4", () => {
    expect(midiToNoteName(60)).toBe("C4");
    expect(midiToNoteName(69)).toBe("A4");
    expect(midiToNoteName(54)).toBe("F#3");
  });

  it("preferFlat 时用降号拼写", () => {
    expect(midiToNoteName(70, true)).toBe("Bb4");
    expect(midiToNoteName(58, true)).toBe("Bb3");
  });
});

describe("noteNameToMidi", () => {
  it("解析升号、降号与负八度", () => {
    expect(noteNameToMidi("C4")).toBe(60);
    expect(noteNameToMidi("A4")).toBe(69);
    expect(noteNameToMidi("F#3")).toBe(54);
    expect(noteNameToMidi("Bb2")).toBe(46);
    expect(noteNameToMidi("C-1")).toBe(0);
  });

  it("非法音名抛错", () => {
    expect(() => noteNameToMidi("H4")).toThrow();
  });
});

describe("pitchClassToName / isBlackKey", () => {
  it("给出音名与黑键判定", () => {
    expect(pitchClassToName(0)).toBe("C");
    expect(pitchClassToName(6)).toBe("F#");
    expect(pitchClassToName(6, true)).toBe("Gb");
    expect(isBlackKey(1)).toBe(true);
    expect(isBlackKey(6)).toBe(true);
    expect(isBlackKey(0)).toBe(false);
    expect(isBlackKey(9)).toBe(false);
  });
});

describe("midiToFrequency", () => {
  it("A4 = 440Hz，每八度翻倍", () => {
    expect(midiToFrequency(69)).toBeCloseTo(440, 6);
    expect(midiToFrequency(57)).toBeCloseTo(220, 6);
    expect(midiToFrequency(81)).toBeCloseTo(880, 6);
  });
});
```

- [ ] **步骤 2：写失败的测试 `tests/theory/interval.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { getInterval } from "../../src/core/theory/interval.ts";

describe("getInterval", () => {
  it("识别大三度、纯五、纯八", () => {
    expect(getInterval(60, 64).semitones).toBe(4);
    expect(getInterval(60, 64).shortName).toBe("M3");
    expect(getInterval(60, 67).shortName).toBe("P5");
    expect(getInterval(60, 72).shortName).toBe("P8");
  });

  it("小二度与大三度区分得开", () => {
    expect(getInterval(60, 61).shortName).toBe("m2");
    expect(getInterval(60, 62).shortName).toBe("M2");
  });

  it("不区分方向", () => {
    expect(getInterval(64, 60).shortName).toBe("M3");
  });

  it("协和度排序：纯五 > 三度 > 二度", () => {
    expect(getInterval(60, 67).consonance).toBeGreaterThan(getInterval(60, 64).consonance);
    expect(getInterval(60, 64).consonance).toBeGreaterThan(getInterval(60, 62).consonance);
  });
});
```

- [ ] **步骤 3：运行测试验证失败**

运行：

```bash
npx vitest run tests/theory/pitch.test.ts tests/theory/interval.test.ts
```

预期：FAIL，错误信息为 `Failed to resolve import "../../src/core/theory/pitch.ts"`（模块尚不存在）。

- [ ] **步骤 4：实现 `src/core/theory/pitch.ts`**

```ts
export type PitchClass = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

export const SHARP_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;
export const FLAT_NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"] as const;

const LETTER_INDEX: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export function midiToPitchClass(midi: number): PitchClass {
  return ((((midi % 12) + 12) % 12) as PitchClass);
}

export function pitchClassToName(pitchClass: number, preferFlat = false): string {
  const pc = midiToPitchClass(pitchClass);
  return preferFlat ? FLAT_NAMES[pc] : SHARP_NAMES[pc];
}

export function midiToNoteName(midi: number, preferFlat = false): string {
  const octave = Math.floor(midi / 12) - 1;
  return `${pitchClassToName(midi, preferFlat)}${octave}`;
}

export function noteNameToMidi(noteName: string): number {
  const match = /^([A-Ga-g])([#b]?)(-?\d+)$/.exec(noteName.trim());
  if (!match) throw new Error(`无法解析的音名: ${noteName}`);
  const base = LETTER_INDEX[match[1].toUpperCase()];
  if (base === undefined) throw new Error(`无法解析的音名: ${noteName}`);
  const accidental = match[2] === "#" ? 1 : match[2] === "b" ? -1 : 0;
  const octave = Number(match[3]);
  return (octave + 1) * 12 + (((base + accidental) % 12) + 12) % 12;
}

export function isBlackKey(pitchClass: number): boolean {
  return [1, 3, 6, 8, 10].includes(midiToPitchClass(pitchClass));
}

export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}
```

- [ ] **步骤 5：实现 `src/core/theory/interval.ts`**

```ts
export interface Interval {
  semitones: number;
  name: string;
  shortName: string;
  consonance: number;
}

export const INTERVALS: readonly Interval[] = [
  { semitones: 0, name: "纯一度", shortName: "P1", consonance: 5 },
  { semitones: 1, name: "小二度", shortName: "m2", consonance: 1 },
  { semitones: 2, name: "大二度", shortName: "M2", consonance: 2 },
  { semitones: 3, name: "小三度", shortName: "m3", consonance: 4 },
  { semitones: 4, name: "大三度", shortName: "M3", consonance: 5 },
  { semitones: 5, name: "纯四度", shortName: "P4", consonance: 4 },
  { semitones: 6, name: "三全音", shortName: "TT", consonance: 1 },
  { semitones: 7, name: "纯五度", shortName: "P5", consonance: 6 },
  { semitones: 8, name: "小六度", shortName: "m6", consonance: 3 },
  { semitones: 9, name: "大六度", shortName: "M6", consonance: 4 },
  { semitones: 10, name: "小七度", shortName: "m7", consonance: 3 },
  { semitones: 11, name: "大七度", shortName: "M7", consonance: 3 },
  { semitones: 12, name: "纯八度", shortName: "P8", consonance: 5 },
];

export function getInterval(a: number, b: number): Interval {
  const raw = Math.abs(b - a);
  const semitones = raw % 12 === 0 && raw > 0 ? 12 : raw % 12;
  return INTERVALS[semitones];
}
```

- [ ] **步骤 6：运行测试验证通过**

运行：

```bash
npx vitest run tests/theory/pitch.test.ts tests/theory/interval.test.ts
```

预期：PASS，两个文件共 9 个用例全部通过。

- [ ] **步骤 7：类型检查**

运行：`npm run typecheck`
预期：退出码 0。

- [ ] **步骤 8：Commit**

```bash
git add src/core/theory/pitch.ts src/core/theory/interval.ts tests/theory/
git commit -m "feat(theory): add pitch, note name and interval primitives"
```

---

## 任务 3：core/theory — 音阶

**文件：**
- 创建：`src/core/theory/scale.ts`
- 创建：`tests/theory/scale.test.ts`

- [ ] **步骤 1：写失败的测试 `tests/theory/scale.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import {
  degreeOfPitch,
  getScalePitches,
  isInScale,
  keyName,
} from "../../src/core/theory/scale.ts";

describe("getScalePitches", () => {
  it("A 大调", () => {
    expect(getScalePitches(9, "major")).toEqual([9, 11, 1, 2, 4, 6, 8]);
  });

  it("A 自然小调", () => {
    expect(getScalePitches(9, "naturalMinor")).toEqual([9, 11, 0, 2, 4, 5, 6]);
  });

  it("A 和声小调的第 7 级升高", () => {
    expect(getScalePitches(9, "harmonicMinor")).toEqual([9, 11, 0, 2, 4, 5, 8]);
  });

  it("A 旋律小调的第 6、7 级升高", () => {
    expect(getScalePitches(9, "melodicMinor")).toEqual([9, 11, 0, 2, 4, 6, 8]);
  });
});

describe("isInScale / degreeOfPitch", () => {
  it("判定调内与级数", () => {
    expect(isInScale(60, 9, "major")).toBe(true);
    expect(isInScale(61, 9, "major")).toBe(true);
    expect(isInScale(60, 9, "naturalMinor")).toBe(true);
    expect(isInScale(61, 9, "naturalMinor")).toBe(false);
  });

  it("级数从 1 开始，不在调内返回 null", () => {
    expect(degreeOfPitch(60, 9, "major")).toBe(3);
    expect(degreeOfPitch(57, 9, "major")).toBe(1);
    expect(degreeOfPitch(61, 9, "naturalMinor")).toBeNull();
  });
});

describe("keyName", () => {
  it("给出可读的调名", () => {
    expect(keyName(9, "major")).toBe("A 大调");
    expect(keyName(6, "naturalMinor")).toBe("F# 自然小调");
  });
});
```

- [ ] **步骤 2：运行测试验证失败**

运行：`npx vitest run tests/theory/scale.test.ts`
预期：FAIL，`Failed to resolve import "../../src/core/theory/scale.ts"`。

- [ ] **步骤 3：实现 `src/core/theory/scale.ts`**

```ts
import { midiToPitchClass, pitchClassToName, type PitchClass } from "./pitch.ts";

export type ScaleId = "major" | "naturalMinor" | "harmonicMinor" | "melodicMinor";

export const SCALE_INTERVALS: Record<ScaleId, readonly number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  naturalMinor: [0, 2, 3, 5, 7, 8, 10],
  harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
  melodicMinor: [0, 2, 3, 5, 7, 9, 11],
};

export const SCALE_LABELS: Record<ScaleId, string> = {
  major: "大调",
  naturalMinor: "自然小调",
  harmonicMinor: "和声小调",
  melodicMinor: "旋律小调",
};

export function getScalePitches(root: PitchClass, scale: ScaleId): PitchClass[] {
  return SCALE_INTERVALS[scale].map(
    (offset) => ((((root + offset) % 12) + 12) % 12) as PitchClass,
  );
}

export function isInScale(pitch: number, root: PitchClass, scale: ScaleId): boolean {
  return getScalePitches(root, scale).includes(midiToPitchClass(pitch));
}

export function degreeOfPitch(pitch: number, root: PitchClass, scale: ScaleId): number | null {
  const index = getScalePitches(root, scale).indexOf(midiToPitchClass(pitch));
  return index === -1 ? null : index + 1;
}

export function keyName(root: PitchClass, scale: ScaleId, preferFlat = false): string {
  return `${pitchClassToName(root, preferFlat)} ${SCALE_LABELS[scale]}`;
}
```

- [ ] **步骤 4：运行测试验证通过**

运行：`npx vitest run tests/theory/scale.test.ts`
预期：PASS，4 个用例通过。

- [ ] **步骤 5：Commit**

```bash
git add src/core/theory/scale.ts tests/theory/scale.test.ts
git commit -m "feat(theory): add scales, key membership and degree lookup"
```

---

## 任务 4：core/theory — 和弦与罗马数字级数

**文件：**
- 创建：`src/core/theory/chord.ts`
- 创建：`tests/theory/chord.test.ts`

**级数规则（实现必须严格遵守，这是关卡 7/8 的判定基础）：**

以调的中心音为根，参考音级偏移固定为 `[0, 2, 4, 5, 7, 9, 11]`。

- 若和弦根音 **正好等于**第 `d` 级参考音 → 该级的大写罗马数字，再按和弦性质决定大小写（大三和弦大写、小三和弦小写、减三和弦小写加 `°`）。
- 若和弦根音 **比第 `d` 级参考音低半音** → 加 `♭` 前缀（`♭III` / `♭VI` / `♭VII` 等借用和弦）。
- 都不匹配 → 返回 `"?"`。

该规则对大调与小调都用**平行大调**作参考，因此 A 小调里 `F` 大三和弦得 `♭VI`、`C` 大三和弦得 `♭III`、`E` 大三和弦得 `V`，与流行/摇滚记谱习惯一致。

- [ ] **步骤 1：写失败的测试 `tests/theory/chord.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import {
  getChordPitches,
  matchChord,
  romanNumeral,
} from "../../src/core/theory/chord.ts";

describe("getChordPitches", () => {
  it("大三和弦与小三和弦", () => {
    expect(getChordPitches({ root: 9, quality: "maj" })).toEqual([9, 1, 4]);
    expect(getChordPitches({ root: 9, quality: "min" })).toEqual([9, 0, 4]);
  });

  it("色彩和弦", () => {
    expect(getChordPitches({ root: 9, quality: "maj7" })).toEqual([9, 1, 4, 8]);
    expect(getChordPitches({ root: 9, quality: "add9" })).toEqual([9, 1, 4, 11]);
  });
});

describe("matchChord", () => {
  it("识别大三和弦", () => {
    expect(matchChord([57, 60, 64], 9)).toEqual({ root: 9, quality: "maj" });
  });

  it("识别小三和弦", () => {
    expect(matchChord([57, 59, 62], 9)).toEqual({ root: 9, quality: "min" });
  });

  it("优先匹配更具体的色彩和弦", () => {
    expect(matchChord([57, 60, 64, 67], 9)).toEqual({ root: 9, quality: "maj7" });
    expect(matchChord([57, 60, 64, 71], 9)).toEqual({ root: 9, quality: "add9" });
    expect(matchChord([57, 59, 62, 65], 9)).toEqual({ root: 9, quality: "min7" });
  });

  it("无法归类时返回 null", () => {
    expect(matchChord([57, 60, 63], 9)).toBeNull();
  });
});

describe("romanNumeral", () => {
  it("大调：调内级数", () => {
    expect(romanNumeral({ root: 9, quality: "maj" }, 9)).toBe("I");
    expect(romanNumeral({ root: 11, quality: "min" }, 9)).toBe("ii");
    expect(romanNumeral({ root: 2, quality: "maj" }, 9)).toBe("IV");
    expect(romanNumeral({ root: 4, quality: "maj" }, 9)).toBe("V");
    expect(romanNumeral({ root: 7, quality: "min" }, 9)).toBe("vi");
  });

  it("大调：借用和弦加 ♭ 前缀", () => {
    expect(romanNumeral({ root: 10, quality: "maj" }, 0)).toBe("♭VII");
    expect(romanNumeral({ root: 3, quality: "maj" }, 0)).toBe("♭III");
  });

  it("小调：以平行大调为参考，流行记谱习惯", () => {
    expect(romanNumeral({ root: 9, quality: "min" }, 9)).toBe("i");
    expect(romanNumeral({ root: 5, quality: "maj" }, 9)).toBe("♭VI");
    expect(romanNumeral({ root: 0, quality: "maj" }, 9)).toBe("♭III");
    expect(romanNumeral({ root: 7, quality: "maj" }, 9)).toBe("♭VII");
    expect(romanNumeral({ root: 4, quality: "maj" }, 9)).toBe("V");
    expect(romanNumeral({ root: 2, quality: "min" }, 9)).toBe("iv");
    expect(romanNumeral({ root: 11, quality: "dim" }, 9)).toBe("ii°");
  });

  it("无法归类时返回 ?", () => {
    expect(romanNumeral({ root: 1, quality: "maj" }, 9)).toBe("?");
  });
});
```

- [ ] **步骤 2：运行测试验证失败**

运行：`npx vitest run tests/theory/chord.test.ts`
预期：FAIL，`Failed to resolve import "../../src/core/theory/chord.ts"`。

- [ ] **步骤 3：实现 `src/core/theory/chord.ts`**

```ts
import { midiToPitchClass, type PitchClass } from "./pitch.ts";

export type ChordQuality =
  | "maj"
  | "min"
  | "dim"
  | "aug"
  | "maj7"
  | "min7"
  | "dom7"
  | "sus2"
  | "sus4"
  | "add9"
  | "m7b5"
  | "dim7";

export interface Chord {
  root: PitchClass;
  quality: ChordQuality;
}

export const CHORD_INTERVALS: Record<ChordQuality, readonly number[]> = {
  maj: [0, 4, 7],
  min: [0, 3, 7],
  dim: [0, 3, 6],
  aug: [0, 4, 8],
  maj7: [0, 4, 7, 11],
  min7: [0, 3, 7, 10],
  dom7: [0, 4, 7, 10],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  add9: [0, 4, 7, 14],
  m7b5: [0, 3, 6, 10],
  dim7: [0, 3, 6, 9],
};

export const CHORD_LABELS: Record<ChordQuality, string> = {
  maj: "大三和弦",
  min: "小三和弦",
  dim: "减三和弦",
  aug: "增三和弦",
  maj7: "大七和弦",
  min7: "小七和弦",
  dom7: "属七和弦",
  sus2: "挂留二度",
  sus4: "挂留四度",
  add9: "加九和弦",
  m7b5: "半减七和弦",
  dim7: "减七和弦",
};

/** 匹配顺序即优先级：越具体的和弦越靠前。 */
export const CHORD_MATCH_ORDER: readonly ChordQuality[] = [
  "add9",
  "maj7",
  "dom7",
  "min7",
  "m7b5",
  "dim7",
  "sus4",
  "sus2",
  "dim",
  "aug",
  "maj",
  "min",
];

export function getChordPitches(chord: Chord): PitchClass[] {
  return CHORD_INTERVALS[chord.quality].map(
    (offset) => ((((chord.root + offset) % 12) + 12) % 12) as PitchClass,
  );
}

export function matchChord(pitches: readonly number[], root: PitchClass): Chord | null {
  const present = new Set(pitches.map(midiToPitchClass));
  for (const quality of CHORD_MATCH_ORDER) {
    const needed = CHORD_INTERVALS[quality].map(
      (offset) => ((((root + offset) % 12) + 12) % 12) as PitchClass,
    );
    if (needed.every((pitch) => present.has(pitch))) {
      return { root, quality };
    }
  }
  return null;
}

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"] as const;
const DEGREE_OFFSETS = [0, 2, 4, 5, 7, 9, 11] as const;

function referenceDegrees(keyRoot: PitchClass): PitchClass[] {
  return DEGREE_OFFSETS.map(
    (offset) => ((((keyRoot + offset) % 12) + 12) % 12) as PitchClass,
  );
}

function applyCase(base: string, quality: ChordQuality): string {
  if (quality === "min" || quality === "min7" || quality === "m7b5") {
    return base.toLowerCase();
  }
  if (quality === "dim" || quality === "dim7") {
    return `${base.toLowerCase()}°`;
  }
  return base;
}

export function romanNumeral(chord: Chord, keyRoot: PitchClass): string {
  const degrees = referenceDegrees(keyRoot);
  const lowered = degrees.map((pitch) => ((((pitch + 11) % 12) + 12) % 12) as PitchClass);

  for (let index = 0; index < degrees.length; index += 1) {
    if (degrees[index] === chord.root) {
      return applyCase(ROMAN[index], chord.quality);
    }
  }
  for (let index = 0; index < lowered.length; index += 1) {
    if (lowered[index] === chord.root) {
      return `♭${applyCase(ROMAN[index], chord.quality)}`;
    }
  }
  return "?";
}
```

- [ ] **步骤 4：运行测试验证通过**

运行：`npx vitest run tests/theory/chord.test.ts`
预期：PASS，5 个用例通过。

若 `♭VI` 用例失败：确认 `referenceDegrees` 用的是 `keyRoot` 加固定偏移（平行大调参考），而不是调内音阶音级。

- [ ] **步骤 5：补 `src/core/theory/index.ts` 桶文件**

```ts
export * from "./pitch.ts";
export * from "./interval.ts";
export * from "./scale.ts";
export * from "./chord.ts";
```

- [ ] **步骤 6：类型检查与全量测试**

运行：`npm run typecheck && npm test`

预期：全部通过。

- [ ] **步骤 7：Commit**

```bash
git add src/core/theory/ tests/theory/
git commit -m "feat(theory): add chord templates, matching and roman numeral labels"
```

---

## 任务 5：core/midi — 类型与写出

**文件：**
- 创建：`src/core/midi/types.ts`
- 创建：`src/core/midi/writer.ts`
- 创建：`tests/midi/writer.test.ts`

- [ ] **步骤 1：写失败的测试 `tests/midi/writer.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { encodeVariableLength, writeMidiFile } from "../../src/core/midi/writer.ts";
import type { MidiFile } from "../../src/core/midi/types.ts";

const demo: MidiFile = {
  format: 1,
  ppq: 480,
  tracks: [
    {
      name: "Music-101",
      events: [
        { kind: "trackName", tick: 0, text: "Music-101" },
        { kind: "tempo", tick: 0, microsecondsPerBeat: 400000 },
        { kind: "marker", tick: 1920, text: "Chorus" },
      ],
    },
    {
      name: "KICK",
      events: [
        { kind: "trackName", tick: 0, text: "KICK" },
        { kind: "noteOn", tick: 0, pitch: 36, velocity: 100, channel: 9 },
        { kind: "noteOff", tick: 120, pitch: 36, velocity: 64, channel: 9 },
      ],
    },
  ],
};

describe("encodeVariableLength", () => {
  it("编码 7 位分组", () => {
    expect(encodeVariableLength(0)).toEqual([0x00]);
    expect(encodeVariableLength(127)).toEqual([0x7f]);
    expect(encodeVariableLength(128)).toEqual([0x81, 0x00]);
    expect(encodeVariableLength(16383)).toEqual([0xff, 0x7f]);
  });
});

describe("writeMidiFile", () => {
  it("写出 MThd 头，格式、轨数、PPQ 正确", () => {
    const bytes = writeMidiFile(demo);
    expect(String.fromCharCode(...bytes.slice(0, 4))).toBe("MThd");
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    expect(view.getUint32(4)).toBe(6);
    expect(view.getUint16(8)).toBe(1);
    expect(view.getUint16(10)).toBe(2);
    expect(view.getUint16(12)).toBe(480);
  });

  it("每个轨块以 MTrk 开头并以 end-of-track 收尾", () => {
    const bytes = writeMidiFile(demo);
    const text = String.fromCharCode(...bytes);
    expect(text.indexOf("MTrk")).toBeGreaterThan(text.indexOf("MThd"));
    expect(text.endsWith("\x00\xff\x2f\x00")).toBe(true);
  });

  it("轨名与标记以 meta 事件写入", () => {
    const bytes = writeMidiFile(demo);
    const text = String.fromCharCode(...bytes);
    expect(text).toContain("KICK");
    expect(text).toContain("Chorus");
    expect(text).toContain("\xff\x03"); // track name
    expect(text).toContain("\xff\x06"); // marker
  });

  it("拒绝负数 VLQ", () => {
    expect(() => encodeVariableLength(-1)).toThrow();
  });
});
```

- [ ] **步骤 2：运行测试验证失败**

运行：`npx vitest run tests/midi/writer.test.ts`
预期：FAIL，`Failed to resolve import "../../src/core/midi/writer.ts"`。

- [ ] **步骤 3：实现 `src/core/midi/types.ts`**

```ts
export const PPQ = 480;

export type MidiEvent =
  | { kind: "noteOn"; tick: number; pitch: number; velocity: number; channel: number }
  | { kind: "noteOff"; tick: number; pitch: number; velocity: number; channel: number }
  | { kind: "tempo"; tick: number; microsecondsPerBeat: number }
  | { kind: "marker"; tick: number; text: string }
  | { kind: "trackName"; tick: number; text: string };

export interface MidiTrack {
  name: string;
  events: MidiEvent[];
}

export interface MidiFile {
  format: 0 | 1;
  ppq: number;
  tracks: MidiTrack[];
}
```

- [ ] **步骤 4：实现 `src/core/midi/writer.ts`**

```ts
import type { MidiEvent, MidiFile, MidiTrack } from "./types.ts";

const META_TRACK_NAME = 0x03;
const META_MARKER = 0x06;
const META_TIMECODE = 0x51;
const META_END_OF_TRACK = 0x2f;

const EVENT_ORDER: Record<MidiEvent["kind"], number> = {
  tempo: 0,
  trackName: 0,
  marker: 0,
  noteOff: 1,
  noteOn: 2,
};

export function encodeVariableLength(value: number): number[] {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`VLQ 需要非负整数，收到 ${value}`);
  }
  const out = [value & 0x7f];
  let rest = Math.floor(value / 128);
  while (rest > 0) {
    out.unshift((rest & 0x7f) | 0x80);
    rest = Math.floor(rest / 128);
  }
  return out;
}

function ascii(text: string): number[] {
  return Array.from(text, (char) => char.charCodeAt(0));
}

function u16(value: number): number[] {
  return [(value >>> 8) & 0xff, value & 0xff];
}

function u32(value: number): number[] {
  return [(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff];
}

function encodeText(text: string): number[] {
  const bytes = Array.from(new TextEncoder().encode(text));
  return [...encodeVariableLength(bytes.length), ...bytes];
}

function sortEvents(events: readonly MidiEvent[]): MidiEvent[] {
  return [...events].sort((a, b) =>
    a.tick !== b.tick ? a.tick - b.tick : EVENT_ORDER[a.kind] - EVENT_ORDER[b.kind],
  );
}

function encodeTrack(track: MidiTrack): number[] {
  const body: number[] = [];
  let lastTick = 0;
  for (const event of sortEvents(track.events)) {
    const delta = event.tick - lastTick;
    lastTick = event.tick;
    body.push(...encodeVariableLength(delta));
    switch (event.kind) {
      case "tempo":
        body.push(
          0xff,
          META_TIMECODE,
          0x03,
          (event.microsecondsPerBeat >>> 16) & 0xff,
          (event.microsecondsPerBeat >>> 8) & 0xff,
          event.microsecondsPerBeat & 0xff,
        );
        break;
      case "trackName":
        body.push(0xff, META_TRACK_NAME, ...encodeText(event.text));
        break;
      case "marker":
        body.push(0xff, META_MARKER, ...encodeText(event.text));
        break;
      case "noteOn":
        body.push(0x90 | (event.channel & 0x0f), event.pitch & 0x7f, event.velocity & 0x7f);
        break;
      case "noteOff":
        body.push(0x80 | (event.channel & 0x0f), event.pitch & 0x7f, event.velocity & 0x7f);
        break;
    }
  }
  body.push(0x00, 0xff, META_END_OF_TRACK, 0x00);
  return body;
}

export function writeMidiFile(file: MidiFile): Uint8Array {
  const parts: number[] = [
    ...ascii("MThd"),
    ...u32(6),
    ...u16(file.format),
    ...u16(file.tracks.length),
    ...u16(file.ppq),
  ];
  for (const track of file.tracks) {
    const body = encodeTrack(track);
    parts.push(...ascii("MTrk"), ...u32(body.length), ...body);
  }
  return new Uint8Array(parts);
}
```

- [ ] **步骤 5：运行测试验证通过**

运行：`npx vitest run tests/midi/writer.test.ts`
预期：PASS，5 个用例通过。

- [ ] **步骤 6：类型检查**

运行：`npm run typecheck`
预期：退出码 0。

- [ ] **步骤 7：Commit**

```bash
git add src/core/midi/types.ts src/core/midi/writer.ts tests/midi/writer.test.ts
git commit -m "feat(midi): add SMF writer with variable length quantities and meta events"
```

---

## 任务 6：core/midi — 读入与往返一致性

**文件：**
- 创建：`src/core/midi/reader.ts`
- 创建：`tests/midi/reader.test.ts`
- 创建：`tests/midi/roundtrip.test.ts`

- [ ] **步骤 1：写失败的测试 `tests/midi/roundtrip.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { readMidiFile } from "../../src/core/midi/reader.ts";
import { writeMidiFile } from "../../src/core/midi/writer.ts";
import type { MidiFile } from "../../src/core/midi/types.ts";

const demo: MidiFile = {
  format: 1,
  ppq: 480,
  tracks: [
    {
      name: "Music-101",
      events: [
        { kind: "trackName", tick: 0, text: "Music-101" },
import { getChordPitches, romanNumeral, type Chord } from "../src/core/theory/chord.ts";
import type { PitchClass } from "../src/core/theory/pitch.ts";
    },
    {
      name: "KICK",
      events: [
        { kind: "trackName", tick: 0, text: "KICK" },
        { kind: "noteOn", tick: 0, pitch: 36, velocity: 100, channel: 9 },
        { kind: "noteOff", tick: 120, pitch: 36, velocity: 64, channel: 9 },
        { kind: "noteOn", tick: 480, pitch: 36, velocity: 110, channel: 9 },
        { kind: "noteOff", tick: 600, pitch: 36, velocity: 64, channel: 9 },
      ],
    },
  ],
};

describe("MIDI 往返", () => {
  it("写出再读入后逐字段相等", () => {
    const back = readMidiFile(writeMidiFile(demo));
    expect(back.format).toBe(1);
    expect(back.ppq).toBe(480);
    expect(back.tracks).toHaveLength(2);
    expect(back.tracks[0].name).toBe("Music-101");
    expect(back.tracks[1].name).toBe("KICK");
    expect(back.tracks[0].events).toEqual(demo.tracks[0].events);
    expect(back.tracks[1].events).toEqual(demo.tracks[1].events);
  });

  it("拒绝非法输入", () => {
    expect(() => readMidiFile(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]))).toThrow();
  });
});
```

- [ ] **步骤 2：写失败的测试 `tests/midi/reader.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { readMidiFile } from "../../src/core/midi/reader.ts";
import { writeMidiFile } from "../../src/core/midi/writer.ts";
import type { MidiFile } from "../../src/core/midi/types.ts";

describe("readMidiFile", () => {
  it("读出 tempo 事件", () => {
    const file: MidiFile = {
      format: 1,
      ppq: 480,
      tracks: [
        {
          name: "Conductor",
          events: [
            { kind: "trackName", tick: 0, text: "Conductor" },
            { kind: "tempo", tick: 0, microsecondsPerBeat: 500000 },
          ],
        },
      ],
    };
    const back = readMidiFile(writeMidiFile(file));
    const tempo = back.tracks[0].events.find((event) => event.kind === "tempo");
    expect(tempo).toEqual({ kind: "tempo", tick: 0, microsecondsPerBeat: 500000 });
  });

  it("同一 tick 上 noteOff 排在 noteOn 之前", () => {
    const file: MidiFile = {
      format: 1,
      ppq: 480,
      tracks: [
        {
          name: "Lead",
          events: [
            { kind: "noteOn", tick: 0, pitch: 60, velocity: 100, channel: 0 },
            { kind: "noteOff", tick: 480, pitch: 60, velocity: 64, channel: 0 },
            { kind: "noteOn", tick: 480, pitch: 62, velocity: 100, channel: 0 },
            { kind: "noteOff", tick: 960, pitch: 62, velocity: 64, channel: 0 },
          ],
        },
      ],
    };
    const back = readMidiFile(writeMidiFile(file));
    const kinds = back.tracks[0].events.map((event) => event.kind);
    expect(kinds).toEqual(["noteOn", "noteOff", "noteOn", "noteOff"]);
    const ticks = back.tracks[0].events.map((event) => event.tick);
    expect(ticks).toEqual([0, 480, 480, 960]);
  });

  it("读出标记文本", () => {
    const file: MidiFile = {
      format: 1,
      ppq: 480,
      tracks: [
        {
          name: "Conductor",
          events: [
            { kind: "trackName", tick: 0, text: "Conductor" },
            { kind: "marker", tick: 960, text: "PreChorus" },
          ],
        },
      ],
    };
    const back = readMidiFile(writeMidiFile(file));
    const marker = back.tracks[0].events.find((event) => event.kind === "marker");
    expect(marker).toEqual({ kind: "marker", tick: 960, text: "PreChorus" });
  });
});
```

- [ ] **步骤 3：运行测试验证失败**

运行：`npx vitest run tests/midi/reader.test.ts tests/midi/roundtrip.test.ts`
预期：FAIL，`Failed to resolve import "../../src/core/midi/reader.ts"`。

- [ ] **步骤 4：实现 `src/core/midi/reader.ts`**

```ts
import type { MidiEvent, MidiFile, MidiTrack } from "./types.ts";

const META_TRACK_NAME = 0x03;
const META_MARKER = 0x06;
const META_TIMECODE = 0x51;
const META_END_OF_TRACK = 0x2f;

function readVariableLength(bytes: Uint8Array, start: number): [number, number] {
  let value = 0;
  let position = start;
  for (;;) {
    const byte = bytes[position];
    position += 1;
    value = (value << 7) | (byte & 0x7f);
    if ((byte & 0x80) === 0) break;
  }
  return [value, position];
}

function readTrack(bytes: Uint8Array, start: number, end: number): MidiTrack {
  const events: MidiEvent[] = [];
  let position = start;
  let tick = 0;
  let runningStatus = 0;
  let name = "";

  while (position < end) {
    const [delta, afterDelta] = readVariableLength(bytes, position);
    position = afterDelta;
    tick += delta;

    let status = bytes[position];
    if (status < 0x80) {
      status = runningStatus;
    } else {
      position += 1;
      runningStatus = status;
    }

    if (status === 0xff) {
      const metaType = bytes[position];
      position += 1;
      const [length, afterLength] = readVariableLength(bytes, position);
      position = afterLength;
      const data = bytes.subarray(position, position + length);
      position += length;

      if (metaType === META_TIMECODE) {
        events.push({
          kind: "tempo",
          tick,
          microsecondsPerBeat: (data[0] << 16) | (data[1] << 8) | data[2],
        });
      } else if (metaType === META_TRACK_NAME) {
        name = new TextDecoder().decode(data);
        events.push({ kind: "trackName", tick, text: name });
      } else if (metaType === META_MARKER) {
        events.push({ kind: "marker", tick, text: new TextDecoder().decode(data) });
      } else if (metaType === META_END_OF_TRACK) {
        break;
      }
    } else if (status === 0xf0 || status === 0xf7) {
      const [length, afterLength] = readVariableLength(bytes, position);
      position = afterLength + length;
    } else {
      const messageType = status & 0xf0;
      const channel = status & 0x0f;
      if (messageType === 0x90 || messageType === 0x80) {
        const pitch = bytes[position];
        const velocity = bytes[position + 1];
        position += 2;
        if (messageType === 0x90 && velocity > 0) {
          events.push({ kind: "noteOn", tick, pitch, velocity, channel });
        } else {
          events.push({ kind: "noteOff", tick, pitch, velocity, channel });
        }
      } else if (messageType === 0xc0 || messageType === 0xd0) {
        position += 1;
      } else {
        position += 2;
      }
    }
  }

  return { name, events };
}

export function readMidiFile(bytes: Uint8Array): MidiFile {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let position = 0;

  const readAscii = (count: number): string => {
    let text = "";
    for (let index = 0; index < count; index += 1) {
      text += String.fromCharCode(bytes[position]);
      position += 1;
    }
    return text;
  };

  if (readAscii(4) !== "MThd") {
    throw new Error("不是合法的 MIDI 文件：缺少 MThd 头");
  }
  const headerLength = view.getUint32(position);
  position += 4;
  const format = view.getUint16(position);
  position += 2;
  const trackCount = view.getUint16(position);
  position += 2;
  const ppq = view.getUint16(position);
  position += 2;
  position += headerLength - 6;

  const tracks: MidiTrack[] = [];
  let parsed = 0;
  while (position < bytes.length && parsed < trackCount) {
    const chunkId = readAscii(4);
    const chunkLength = view.getUint32(position);
    position += 4;
    const chunkEnd = position + chunkLength;
    if (chunkId === "MTrk") {
      tracks.push(readTrack(bytes, position, chunkEnd));
      parsed += 1;
    }
    position = chunkEnd;
  }

  return { format: format === 0 ? 0 : 1, ppq, tracks };
}
```

- [ ] **步骤 5：运行测试验证通过**

运行：`npx vitest run tests/midi/reader.test.ts tests/midi/roundtrip.test.ts`
预期：PASS，5 个用例通过。

- [ ] **步骤 6：全量测试与类型检查**

运行：`npm run typecheck && npm test`
预期：全部通过。

- [ ] **步骤 7：Commit**

```bash
git add src/core/midi/reader.ts tests/midi/
git commit -m "feat(midi): add SMF reader and verify write-read round trip"
```

---

## 任务 7：core/midi — 骨架到 MIDI 的领域转换

**文件：**
- 创建：`src/core/midi/project.ts`
- 创建：`src/core/midi/index.ts`
- 创建：`src/core/index.ts`
- 创建：`tests/midi/project.test.ts`

**分层约定**：`core/midi` 不依赖 `core/theory`。和弦的音高由调用方（脚本 / 未来的课程引擎）算好后放进 `SkeletonChord.pitches`。

- [ ] **步骤 1：写失败的测试 `tests/midi/project.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { barToTick, skeletonToMidi } from "../../src/core/midi/project.ts";
import { PPQ } from "../../src/core/midi/types.ts";
import type { SongSkeleton } from "../../src/core/midi/project.ts";

const skeleton: SongSkeleton = {
  bpm: 150,
  keyRoot: 6,
  keyScale: "naturalMinor",
  beatsPerBar: 4,
  totalBars: 4,
  sections: [
    { name: "Intro", startBar: 0, bars: 1 },
    { name: "Chorus", startBar: 1, bars: 2 },
  ],
  tracks: [
    {
      role: "KICK",
      channel: 9,
      notes: [{ tick: 0, dur: 120, pitch: 36, vel: 100 }],
    },
  ],
  chords: [{ tick: 0, pitches: [54, 57, 61], text: "F#m" }],
};

describe("barToTick", () => {
  it("小节换算为 tick", () => {
    expect(barToTick(0, 4)).toBe(0);
    expect(barToTick(1, 4)).toBe(4 * PPQ);
    expect(barToTick(3, 4)).toBe(3 * 4 * PPQ);
  });
});

describe("skeletonToMidi", () => {
  it("生成导轨 + 各乐器轨 + 和弦轨", () => {
    const midi = skeletonToMidi(skeleton);
    expect(midi.ppq).toBe(PPQ);
    expect(midi.tracks.map((track) => track.name)).toEqual([
      "Music-101",
      "KICK",
      "CHORDS",
    ]);
  });

  it("150 BPM 对应 400000 微秒每拍", () => {
    const midi = skeletonToMidi(skeleton);
    const tempo = midi.tracks[0].events.find((event) => event.kind === "tempo");
    expect(tempo).toEqual({ kind: "tempo", tick: 0, microsecondsPerBeat: 400000 });
  });

  it("段落标记落在正确 tick", () => {
    const midi = skeletonToMidi(skeleton);
    const markers = midi.tracks[0].events.filter(
      (event) => event.kind === "marker" && (event.text === "Intro" || event.text === "Chorus"),
    );
    expect(markers).toEqual([
      { kind: "marker", tick: 0, text: "Intro" },
      { kind: "marker", tick: 4 * PPQ, text: "Chorus" },
    ]);
  });

  it("每个和弦也在导轨上留一个同名标记", () => {
    const midi = skeletonToMidi(skeleton);
    const chordMarker = midi.tracks[0].events.find(
      (event) => event.kind === "marker" && event.text === "F#m",
    );
    expect(chordMarker).toEqual({ kind: "marker", tick: 0, text: "F#m" });
  });

  it("每个音符展开为 noteOn + noteOff", () => {
    const midi = skeletonToMidi(skeleton);
    const kick = midi.tracks[1].events.filter(
      (event) => event.kind === "noteOn" || event.kind === "noteOff",
    );
    expect(kick).toEqual([
      { kind: "noteOn", tick: 0, pitch: 36, velocity: 100, channel: 9 },
      { kind: "noteOff", tick: 120, pitch: 36, velocity: 64, channel: 9 },
    ]);
  });

  it("和弦轨写出三和弦音，音长一小节", () => {
    const midi = skeletonToMidi(skeleton);
    const notes = midi.tracks[2].events.filter((event) => event.kind === "noteOn");
    expect(notes).toEqual([
      { kind: "noteOn", tick: 0, pitch: 54, velocity: 90, channel: 3 },
      { kind: "noteOn", tick: 0, pitch: 57, velocity: 90, channel: 3 },
      { kind: "noteOn", tick: 0, pitch: 61, velocity: 90, channel: 3 },
    ]);
    const offs = midi.tracks[2].events.filter((event) => event.kind === "noteOff");
    expect(offs[0]?.tick).toBe(4 * PPQ);
  });
});
```

- [ ] **步骤 2：运行测试验证失败**

运行：`npx vitest run tests/midi/project.test.ts`
预期：FAIL，`Failed to resolve import "../../src/core/midi/project.ts"`。

- [ ] **步骤 3：实现 `src/core/midi/project.ts`**

```ts
import type { PitchClass } from "../theory/pitch.ts";
import type { ScaleId } from "../theory/scale.ts";
import { PPQ, type MidiEvent, type MidiFile, type MidiTrack } from "./types.ts";

export type TrackRole =
  | "KICK"
  | "SNARE"
  | "CLAP"
  | "HAT"
  | "808"
  | "BASS"
  | "SUPERSAW"
  | "CHOP"
  | "ARP"
  | "FX";

export const DRUM_ROLES = ["KICK", "SNARE", "CLAP", "HAT"] as const;
export type DrumRole = (typeof DRUM_ROLES)[number];

/** General MIDI 打击乐音高。 */
export const GM_DRUM_PITCH: Record<DrumRole, number> = {
  KICK: 36,
  SNARE: 38,
  CLAP: 39,
  HAT: 42,
};

export interface Section {
  name: string;
  startBar: number;
  bars: number;
}

export interface SkeletonNote {
  tick: number;
  dur: number;
  pitch: number;
  vel: number;
}

export interface SkeletonTrack {
  role: TrackRole;
  channel: number;
  notes: SkeletonNote[];
}

export interface SkeletonChord {
  tick: number;
  /** 和弦音的 MIDI 音高，由调用方算好（core/midi 不依赖 core/theory） */
  pitches: number[];
  /** 标记与轨面上显示的和弦名，例如 "F#m" */
  text: string;
}

export interface SongSkeleton {
  bpm: number;
  keyRoot: PitchClass;
  keyScale: ScaleId;
  beatsPerBar: number;
  totalBars: number;
  sections: Section[];
  tracks: SkeletonTrack[];
  chords: SkeletonChord[];
}

export const CHORD_TRACK_NAME = "CHORDS";
export const CHORD_TRACK_CHANNEL = 3;

export function barToTick(bar: number, beatsPerBar: number, ppq: number = PPQ): number {
  return bar * beatsPerBar * ppq;
}

export function skeletonToMidi(skeleton: SongSkeleton): MidiFile {
  const conductor: MidiTrack = {
    name: "Music-101",
    events: [
      { kind: "trackName", tick: 0, text: "Music-101" },
      {
        kind: "tempo",
        tick: 0,
        microsecondsPerBeat: Math.round(60_000_000 / skeleton.bpm),
      },
    ],
  };

  for (const section of skeleton.sections) {
    conductor.events.push({
      kind: "marker",
      tick: barToTick(section.startBar, skeleton.beatsPerBar),
      text: section.name,
    });
  }

  for (const chord of skeleton.chords) {
    conductor.events.push({ kind: "marker", tick: chord.tick, text: chord.text });
  }

  const tracks: MidiTrack[] = [conductor];

  for (const skeletonTrack of skeleton.tracks) {
    const events: MidiEvent[] = [
      { kind: "trackName", tick: 0, text: skeletonTrack.role },
    ];
    for (const note of skeletonTrack.notes) {
      events.push({
        kind: "noteOn",
        tick: note.tick,
        pitch: note.pitch,
        velocity: note.vel,
        channel: skeletonTrack.channel,
      });
      events.push({
        kind: "noteOff",
        tick: note.tick + note.dur,
        pitch: note.pitch,
        velocity: 64,
        channel: skeletonTrack.channel,
      });
    }
    tracks.push({ name: skeletonTrack.role, events });
  }

  if (skeleton.chords.length > 0) {
    const chordEvents: MidiEvent[] = [
      { kind: "trackName", tick: 0, text: CHORD_TRACK_NAME },
    ];
    const barTicks = skeleton.beatsPerBar * PPQ;
    for (const chord of skeleton.chords) {
      for (const pitch of chord.pitches) {
        chordEvents.push({
          kind: "noteOn",
          tick: chord.tick,
          pitch,
          velocity: 90,
          channel: CHORD_TRACK_CHANNEL,
        });
        chordEvents.push({
          kind: "noteOff",
          tick: chord.tick + barTicks,
          pitch,
          velocity: 64,
          channel: CHORD_TRACK_CHANNEL,
        });
      }
    }
    tracks.push({ name: CHORD_TRACK_NAME, events: chordEvents });
  }

  return { format: 1, ppq: PPQ, tracks };
}
```

- [ ] **步骤 4：写桶文件 `src/core/midi/index.ts`**

```ts
export * from "./types.ts";
export * from "./writer.ts";
export * from "./reader.ts";
export * from "./project.ts";
```

- [ ] **步骤 5：写桶文件 `src/core/index.ts`**

```ts
export * from "./theory/index.ts";
export * from "./midi/index.ts";
```

- [ ] **步骤 6：运行测试验证通过**

运行：`npx vitest run tests/midi/project.test.ts`
预期：PASS，7 个用例通过。

- [ ] **步骤 7：全量测试与类型检查**

运行：`npm run typecheck && npm test`
预期：全部通过。

- [ ] **步骤 8：Commit**

```bash
git add src/core/ tests/midi/project.test.ts
git commit -m "feat(midi): convert song skeletons into multi track MIDI files"
```

---

## 任务 8：生成演示 MIDI 的命令行脚本

**文件：**
- 创建：`scripts/make-test-midi.ts`
- 创建（自动，不入库）：`out/music101-test.mid`

- [ ] **步骤 1：写 `scripts/make-test-midi.ts`**

```ts
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  GM_DRUM_PITCH,
  barToTick,
  skeletonToMidi,
  type SkeletonChord,
  type SkeletonNote,
  type SongSkeleton,
} from "../src/core/midi/project.ts";
import { PPQ } from "../src/core/midi/types.ts";
import { writeMidiFile } from "../src/core/midi/writer.ts";
import { getChordPitches, romanNumeral, type Chord } from "../src/core/theory/chord.ts";
import type { PitchClass } from "../src/core/theory/pitch.ts";

const BPM = 150;
const BEATS_PER_BAR = 4;
const TOTAL_BARS = 8;
const KEY_ROOT: PitchClass = 6; // F#

interface ProgressionEntry {
  startBar: number;
  chord: Chord;
  label: string;
}

/** F# 小调：i – ♭VI – IV – I，每段两小节。 */
const PROGRESSION: ProgressionEntry[] = [
  { startBar: 0, chord: { root: 6, quality: "min" }, label: "F#m" },
  { startBar: 2, chord: { root: 2, quality: "maj" }, label: "D" },
  { startBar: 4, chord: { root: 11, quality: "maj" }, label: "B" },
  { startBar: 6, chord: { root: 6, quality: "maj" }, label: "F#" },
];

const sections = [
  { name: "Intro", startBar: 0, bars: 2 },
  { name: "Verse", startBar: 2, bars: 2 },
  { name: "PreChorus", startBar: 4, bars: 2 },
  { name: "Chorus", startBar: 6, bars: 2 },
];

const kickNotes: SkeletonNote[] = [];
for (let bar = 0; bar < TOTAL_BARS; bar += 1) {
  for (const beat of [0, 1, 2, 3]) {
    kickNotes.push({
      tick: barToTick(bar, BEATS_PER_BAR) + beat * PPQ,
      dur: 120,
      pitch: GM_DRUM_PITCH.KICK,
      vel: 110,
    });
  }
}

const bassNotes: SkeletonNote[] = [];
const supersawNotes: SkeletonNote[] = [];
const chords: SkeletonChord[] = [];

for (const entry of PROGRESSION) {
  const pitches = getChordPitches(entry.chord);
  const numeral = romanNumeral(entry.chord, KEY_ROOT);
  chords.push({
    tick: barToTick(entry.startBar, BEATS_PER_BAR),
    pitches: pitches.map((pitch) => 48 + pitch),
    text: `${entry.label} (${numeral})`,
  });

  for (let bar = entry.startBar; bar < entry.startBar + 2; bar += 1) {
    const base = barToTick(bar, BEATS_PER_BAR);
    for (let beat = 0; beat < BEATS_PER_BAR; beat += 1) {
      bassNotes.push({
        tick: base + beat * PPQ,
        dur: PPQ - 20,
        pitch: 24 + pitches[0],
        vel: 100,
      });
    }
    for (const pitch of pitches) {
      supersawNotes.push({ tick: base, dur: PPQ * 4 - 20, pitch: 48 + pitch, vel: 80 });
      supersawNotes.push({ tick: base, dur: PPQ * 4 - 20, pitch: 60 + pitch, vel: 70 });
    }
  }
}

const skeleton: SongSkeleton = {
  bpm: BPM,
  keyRoot: KEY_ROOT,
  keyScale: "naturalMinor",
  beatsPerBar: BEATS_PER_BAR,
  totalBars: TOTAL_BARS,
  sections,
  tracks: [
    { role: "KICK", channel: 9, notes: kickNotes },
    { role: "808", channel: 0, notes: bassNotes },
    { role: "BASS", channel: 1, notes: bassNotes },
    { role: "SUPERSAW", channel: 2, notes: supersawNotes },
  ],
  chords,
};

const outputPath = resolve(process.cwd(), "out", "music101-test.mid");
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, writeMidiFile(skeletonToMidi(skeleton)));

console.log(`已生成 ${outputPath}`);
console.log(`轨道：${skeleton.tracks.map((track) => track.role).join(", ")} + CHORDS`);
console.log(`速度 ${BPM} BPM，${TOTAL_BARS} 小节，段落：${sections.map((s) => s.name).join(" / ")}`);
console.log(`进行：${chords.map((chord) => chord.text).join(" | ")}`);
```


- [ ] **步骤 2：运行脚本**

运行：`npm run make:midi`

预期输出：

```
已生成 D:\Workspace\Github\Music-101\Music-101\out\music101-test.mid
轨道：KICK, 808, BASS, SUPERSAW + CHORDS
速度 150 BPM，8 小节，段落：Intro / Verse / PreChorus / Chorus
进行：F#m (i) | D (♭VI) | B (IV) | F# (I)
```

- [ ] **步骤 3：确认文件真的存在且非空**

运行：

```bash
node -e "const b=require('fs').readFileSync('out/music101-test.mid');console.log('bytes',b.length,'head',b.subarray(0,4).toString());"
```

预期：`bytes` 大于 1000，`head MThd`。

- [ ] **步骤 4：把 `out/` 加入 `.gitignore`**

在 `.gitignore` 末尾追加：

```
# 生成的演示 MIDI（构建产物）
out/
```

- [ ] **步骤 5：类型检查**

运行：`npm run typecheck`
预期：退出码 0。

- [ ] **步骤 6：Commit**

```bash
git add scripts/make-test-midi.ts .gitignore
git commit -m "feat(scripts): add CLI to generate a demo MIDI for Cubase import checks"
```

---

## 任务 9：最小 React 外壳接入 theory

**文件：**
- 修改：`src/App.tsx`

- [ ] **步骤 1：写 `src/App.tsx`**

```tsx
import { useState } from "react";
import {
  getChordPitches,
  getScalePitches,
  keyName,
  pitchClassToName,
  romanNumeral,
  type ChordQuality,
  type PitchClass,
  type ScaleId,
} from "./core/index.ts";

const ROOTS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as PitchClass[];
const SCALES: ScaleId[] = ["major", "naturalMinor", "harmonicMinor", "melodicMinor"];
const QUALITIES: ChordQuality[] = ["maj", "min", "maj7", "min7", "add9", "sus4", "dom7"];

export function App() {
  const [root, setRoot] = useState<PitchClass>(6);
  const [scale, setScale] = useState<ScaleId>("naturalMinor");
  const [quality, setQuality] = useState<ChordQuality>("min");

  const scalePitches = getScalePitches(root, scale);
  const currentChord = { root, quality };
  const chordPitches = getChordPitches(currentChord);

  return (
    <main>
      <h1>Music-101</h1>
      <p>kawaii bass / future bass 编曲速成 —— M1 地基</p>

      <section>
        <label>
          调
          <select
            value={root}
            onChange={(event) => setRoot(Number(event.target.value) as PitchClass)}
          >
            {ROOTS.map((pitch) => (
              <option key={pitch} value={pitch}>
                {pitchClassToName(pitch)}
              </option>
            ))}
          </select>
        </label>
        <label>
          音阶
          <select value={scale} onChange={(event) => setScale(event.target.value as ScaleId)}>
            {SCALES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label>
          和弦性质
          <select
            value={quality}
            onChange={(event) => setQuality(event.target.value as ChordQuality)}
          >
            {QUALITIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section>
        <h2>{keyName(root, scale)}</h2>
        <p>音阶：{scalePitches.map((pitch) => pitchClassToName(pitch)).join(" · ")}</p>
      </section>

      <section>
        <h2>
          {pitchClassToName(root)}
          {quality} → {romanNumeral(currentChord, root)}
        </h2>
        <p>和弦音：{chordPitches.map((pitch) => pitchClassToName(pitch)).join(" · ")}</p>
      </section>
    </main>
  );
}
```

- [ ] **步骤 2：类型检查与构建**

运行：

```bash
npm run typecheck && npm run build
```

预期：两条命令都退出码 0，`dist/index.html` 生成。

- [ ] **步骤 3：在浏览器里确认渲染**

运行：`npm run dev -- --port 5180`

然后用 Browser 工具打开 `http://localhost:5180`。

预期：页面显示 "Music-101"，能切换调 / 音阶 / 和弦性质，且"和弦音"与"→ 级数"随选择变化。默认（调 F#、自然小调、小三和弦）应显示级数 `i`、和弦音 `F# · A · C#`。

- [ ] **步骤 4：关闭开发服务器**

按 `Ctrl+C` 结束 `npm run dev` 进程。

- [ ] **步骤 5：Commit**

```bash
git add src/App.tsx
git commit -m "feat(ui): wire theory core into the app shell"
```

---

## 任务 10：Cubase 13 实机导入验证

**文件：**
- 创建：`docs/superpowers/plans/verification/2026-10-20-cubase-import-check.md`（验证记录）

**前置条件（全部满足才继续）：**
- `npm run make:midi` 已生成 `out/music101-test.mid`
- cua-driver 已安装并可用（`list_apps` 能返回 `Cubase13.exe`）

- [ ] **步骤 1：启动或激活 Cubase 13**

用 `list_apps`（`include_installed: true`）确认 `Cubase13.exe` 是否在运行。若未运行，用 `launch_app` 启动 `D:\Production\Cubase 13\Cubase13.exe`，等待主窗口出现。

预期：`get_app_state` 能读到标题为 `Cubase Pro Hub` 的窗口。

- [ ] **步骤 2：打开 MIDI 导入对话框**

在 Cubase 窗口里用菜单导航：文件 → 导入 → MIDI 文件…（Cubase 13 中文界面；如菜单名不同，展开"文件"菜单后按截图确认实际项）。

预期：出现系统文件选择对话框。

- [ ] **步骤 3：填入文件路径**

在文件名输入框中输入完整路径：

```
D:\Workspace\Github\Music-101\Music-101\out\music101-test.mid
```

然后确认（回车）。

预期：文件被导入，工程中出现轨道。

- [ ] **步骤 4：截图核对并记录**

用 `get_app_state`（带截图）观察工程窗口，逐条核对：

| 检查项 | 期望 |
|---|---|
| 轨道名 | `Music-101`、`KICK`、`808`、`BASS`、`SUPERSAW`、`CHORDS` |
| 速度 | 传输条显示 `150.00` BPM |
| 段落标记 | 标尺上出现 `Intro`、`Verse`、`PreChorus`、`Chorus` |
| 和弦标记 | 标尺上出现 `F#m (i)`、`D (♭VI)`、`B (IV)`、`F# (I)` |
| 小节数 | 工程总长 8 小节 |
| 和弦轨 | `CHORDS` 轨上每小节有 3 个同时发声的音 |

- [ ] **步骤 5：把实测结果写入 `docs/superpowers/plans/verification/2026-10-20-cubase-import-check.md`**

文件内容按实测填写：

```markdown
# Cubase 13 MIDI 导入验证（2026-10-20）

输入文件：`out/music101-test.mid`（150 BPM，F# 小调，8 小节，i–♭VI–IV–I）

| 检查项 | 期望 | 实测 | 结论 |
|---|---|---|---|
| 轨道名 | Music-101 / KICK / 808 / BASS / SUPERSAW / CHORDS | <实测> | <通过/失败> |
| 速度 | 150.00 BPM | <实测> | <通过/失败> |
| 段落标记 | Intro / Verse / PreChorus / Chorus | <实测> | <通过/失败> |
| 和弦标记 | F#m (i) / D (♭VI) / B (IV) / F# (I) | <实测> | <通过/失败> |
| 小节数 | 8 | <实测> | <通过/失败> |
| 和弦轨 | CHORDS 轨每小节 3 个音 | <实测> | <通过/失败> |

## 结论

<结论；若段落标记没有出现，说明 Cubase 未导入 FF 06 marker，需要改用其他段落标记方式。>
```

- [ ] **步骤 6：Commit**

```bash
git add docs/superpowers/plans/verification/2026-10-20-cubase-import-check.md
git commit -m "docs: record Cubase 13 MIDI import verification results"
```

---

## 完成标准

- [ ] `npm test` 全绿
- [ ] `npm run typecheck` 与 `npm run build` 均通过
- [ ] `npm run make:midi` 产出 `out/music101-test.mid`
- [ ] Cubase 13 导入验证记录已提交，轨名 / 速度 / 段落标记三项全部通过
- [ ] 规格第 8 节的 M1 验收标准满足

## 交给下一个计划的事

M1 完成后，下一个计划（M2）需要的已就位基础：

- `core/theory` 的和弦与级数 API（`getChordPitches` / `matchChord` / `romanNumeral`）
- `core/midi` 的骨架转换与写出 API（`SongSkeleton` / `skeletonToMidi` / `writeMidiFile`）
- "网页与 Cubase 共享同一套参数语义"这一前提

M2 将在其上叠加 `core/audio` 合成引擎、16 格步进器与决策式任务 UI。

**留给 M5 的待验证项**：MMA Chord Name 事件（FF 06）在 Cubase 13 里能否被识别为 Chord 轨。因为 FF 06 与 Marker 冲突，M1 只写 Marker；M5 应产出一个**只含和弦事件**的独立文件来隔离测试。
