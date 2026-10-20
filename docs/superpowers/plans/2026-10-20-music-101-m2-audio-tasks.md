# M2 声音 + 任务框架 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [x]`）语法来跟踪进度。

**目标：** 在 M1 的乐理 / MIDI 地基上，做出能听的合成器、16 格步进器、第 1 关的决策式任务，以及诊断框架。验收：不靠 Cubase，在网页里走完第 1 关并下载一个 `.mid`。

**架构：** 能单测的部分留在纯函数里：音色参数、步进器格子、关卡判定、诊断规则、MIDI 骨架。只有 `core/audio/engine.ts` 接触 Web Audio。第 1 关内容是类型化的 TypeScript 模块，不先上 JSON 课程包。页面继续用 Ant Design 深色壳，乐理工作台保留，旁边加「第 1 关」。

**技术栈：** 与 M1 相同（Vite、React 19、TypeScript、Vitest、Ant Design 6）。音频只用 Web Audio API，不引入采样、Tone.js 或 fflate。

**规格来源：** `docs/superpowers/specs/2026-10-20-music-101-design.md` 第 3.2–3.5、3.7、4 节，以及第 8 节的 M2。

**起点：** 分支 `m2` 从 `cursor/m1-skeleton-and-shell-6b8a` 的尖端拉开。M1 的 PR #1 不再追加提交。

---

## 范围边界

**本计划只做 M2。** 不做这些：

- M3 的六条诊断规则（和声归属、能量曲线、低频冲突、频段占位、结构体检、和弦色彩重复度）和能量曲线图
- M4–M6 的其余 23 关、参考曲分析、错误画像、雷达图、配方库
- Cubase / cua-driver 实机操作
- ZIP 打包、账号、后端

M2 的完成标准：**第 1 关六步能走完，并下载一个含有正确音高与时值的 `.mid`。** 合成器音色和 Cubase 插件音色不是同一个东西，导出说明里要写明这一点。

## 第 1 关（最小可过关版本）

主题是规格里的关 1「音高与键盘直觉」，不是鼓组课。16 格步进器作为这一关的手做任务出现，这样 M2 要求的步进器是过关路径的一部分，而不是旁边一个没用的演示。

| 步骤 | 做什么 | 过关 |
|---|---|---|
| 概念 | 短文：音高、八度、C4 = MIDI 60、一格 = 十六分音符 | 点「下一步」 |
| 听辨 | 5 道「哪个更高 / 哪个是这个音」。选项上直接写音名（听辨的视觉等价物），旁边有播放按钮 | 至少答对 4 题 |
| 手做 | 点出 C4；16 格里打开第 1、5、9、13 格（四个四分音符） | 音高是 MIDI 60，格子与目标一致 |
| 诊断 | 错了给出原因，并给可点击的修正（把音高设成 C4、把格子填成四个四分音符） | 修正后重新判定 |
| 导出 | 下载 `level1.mid` | 按钮只在过关后可点 |

电脑键盘：`A`–`K` 从当前八度的 C 起按半音往上弹（`A` = C，`K` = A#）。`Q` 低一个八度，`W` 回到第 4 八度，`E` 高一个八度。鼠标点琴键同样有效。

导出文件：120 BPM，1 小节，标记 `Level1`，轨名 `MELODY`，音高为选中的音，打开的格子各一个音。十六分音符 = `PPQ / 4` = 120 tick。不写和弦 meta 事件。网页音色与 Cubase 音色不同，这一点写在导出步骤的说明里。

## 全局约定

1. 相对导入带 `.ts` 扩展名，类型用 `import type`。
2. 不用 `enum` / `namespace` / 参数属性。
3. `core/midi` 继续不在运行时调用 `core/theory`。关卡导出在 `core/lesson` 里组装 `SongSkeleton`，再调用已有的 `skeletonToMidi`。
4. 诊断框架只提供 `Diagnostic`、`DiagnosticRule` 和 `runDiagnostics`。第 1 关注册自己的两条规则。M3 的六条规则不在这里实现。
5. 全量测试：`npm test`。类型检查：`npm run typecheck`。

## 文件结构

| 文件 | 职责 |
|---|---|
| `src/core/audio/params.ts` | 各积木的纯参数：kick 音高包络、supersaw 失谐、饱和曲线、侧链增益点 |
| `src/core/audio/schedule.ts` | 十六分音符秒数、lookahead 窗口里该触发哪些格 |
| `src/core/audio/engine.ts` | Web Audio 图：kick / 808 / bass / supersaw / pluck / chop / fx，以及侧链 Gain |
| `src/core/sequencer/grid.ts` | 16 格开关、1/2/4 小节视图、四分音符目标 |
| `src/core/analyze/types.ts` | `Diagnostic` / `DiagnosticRule` |
| `src/core/analyze/run.ts` | `runDiagnostics` |
| `src/content/level1.ts` | 第 1 关文案、听辨题、目标音、目标格子 |
| `src/core/lesson/keys.ts` | `A`–`K` 与 `Q`/`W`/`E` |
| `src/core/lesson/level1.ts` | 听辨计分、过关、诊断、修正、MIDI |
| `src/core/lesson/progress.ts` | localStorage 进度的解析与版本 |
| `src/ui/Piano.tsx` | 从乐理页抽出的一个八度键盘 |
| `src/ui/TheoryBench.tsx` | 现有乐理工作台 |
| `src/ui/Stepper.tsx` | 16 格步进器 |
| `src/ui/LessonOne.tsx` | 第 1 关六步 |
| `src/App.tsx` | 顶栏在「乐理工作台」和「第 1 关」之间切换 |
| `src/core/midi/project.ts` | `TrackRole` 增加 `MELODY`，给关卡 1 的音符轨用 |

## 任务 1：合成参数与步进调度（纯函数）

- [x] 写 `params.ts`：kick 从 60Hz 落到 40Hz；supersaw 为 7 个失谐锯齿；`saturationCurve` 两端饱和且关于 0 大致对称；`sidechainAutomation` 在触发格把增益压到 0.2 再回到 1。
- [x] 写 `schedule.ts`：`stepSeconds(bpm)` 在 120 BPM 时为 0.125 秒；`takeDue` 只返回 lookahead 窗口内还没排过的格。
- [x] 测试：`tests/audio/params.test.ts`。
- [x] `npm run typecheck` 通过后提交。

## 任务 2：Web Audio 引擎

- [x] `engine.ts` 提供 `createEngine()`。没有 `AudioContext` 时返回 `null`。
- [x] `playPitch` 走 pluck（短衰减锯齿或方波 + 增益包络），给听辨和点琴键用。
- [x] `playVoice` 覆盖 kick、808（正弦 + 长音高包络 + 饱和）、bass（锯齿 → 低通 → 饱和）、supersaw、chop（简单 FM）、fx（噪声 + 带通扫频）。
- [x] `playSteps` 按格子把音排进 `currentTime` 之后。`applySidechain` 把任务 1 的增益点写到 `GainNode`。
- [x] 不写采样文件，不在单测里启动真实音频设备。

## 任务 3：16 格步进器模型

- [x] `grid.ts`：一小节 16 格；`resizeSteps` 在 1/2/4 小节之间保留已有格子；`toggleStep`；`isQuarterBar` 只在第 0、4、8、12 格为开。
- [x] 测试：`tests/sequencer/grid.test.ts`。

## 任务 4：诊断框架与第 1 关判定

- [x] `Diagnostic` 含 `id`、`severity`（`info` / `warning` / `error`）、`message`、可选 `bar` / `step`、可选 `fix`（`label` + `actionId`）。
- [x] `runDiagnostics` 按规则顺序拼结果，不吞掉空规则。
- [x] 第 1 关只注册两条规则：音高必须是 C4；第一小节必须是四个四分音符。修正动作 `set-pitch-c4` 与 `set-quarter-grid`。
- [x] 听辨 5 题，对 4 题才算过。未答完不算过关。
- [x] 过关后 `level1ToMidi` 生成 120 BPM、标记 `Level1`、轨 `MELODY`、四个 MIDI 60 的音，tick 为 0 / 480 / 960 / 1440。读回应一致。
- [x] 测试：`tests/analyze/framework.test.ts`、`tests/lesson/level1.test.ts`。

## 任务 5：键盘映射与进度

- [x] `A` 在第 4 八度等于 MIDI 60，`K` 等于 A#4。`Q` / `E` 改八度，`W` 回到 4。
- [x] 进度 JSON：`schema: 1`。坏数据或更高版本返回空进度，不抛到界面上。
- [x] 测试：`tests/lesson/keys.test.ts`、`tests/lesson/progress.test.ts`。

## 任务 6：第 1 关界面

- [x] 顶栏可在乐理工作台与第 1 关之间切换。乐理页行为保持不变。
- [x] 第 1 关用 Ant Design 的步骤条串起概念、听辨、手做、诊断、导出。
- [x] 步进器一排 16 格，可切 2 小节 / 4 小节。过关只看第 1 小节。
- [x] 诊断上的修正按钮直接改音高或格子。
- [x] 过关后下载 `level1.mid`。导出说明写明：这是音高和节奏，不是 Cubase 里的音色。
- [x] 点琴键、`A`–`K`、听辨题的「播放」都走 `playPitch`。音频不可用时界面仍可作答和导出。

## 任务 7：验收

- [x] `npm test`、`npm run typecheck`、`npm run build` 通过。
- [x] 浏览器里走完第 1 关：答听辨、点 C4、打开四个四分音符格子、看到通过、导出按钮可点。步进器在 1 小节视图下可辨认。

## 留给后面的事

- M3 把六条诊断规则接到 `runDiagnostics`，并画能量曲线。
- M4 把关 2–8 填进同一套步骤壳。
- 侧链在第 1 关只作为引擎能力存在，关 12 才会变成学员要听的泵动。
