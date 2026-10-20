# M3 诊断引擎 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 在已有的 `runDiagnostics` 上接上规格 3.3 的六条确定性规则，并把每小节能量画成曲线。用构造样例验证每条规则的判定和小节定位。

**架构：** 输入是 `AnalysisSong`（由骨架或测试直接构造，不读 Cubase）。阈值只放在 `core/analyze/thresholds.ts`。规则各自一个文件，经 `runDiagnostics` 汇总。第 1 关原有的两条规则留在 `core/lesson/level1.ts`，不并进这六条。界面加「诊断」页：选样例、看曲线、看诊断列表。

**技术栈：** 与 M2 相同。曲线用 SVG，不加图表库。

**规格来源：** `docs/superpowers/specs/2026-10-20-music-101-design.md` 第 3.3、3.3.1 节和第 8 节 M3。

**起点：** 分支 `m3` 从 `m2` 尖端拉开。

---

## 范围边界

做：六条规则、能量序列、能量曲线、样例页、单测。

不做：Cubase / Studio One 实机导入、cua-driver、虚拟 MIDI、Agent A1–A3、关 2–8（那是 M4）、改钢琴键映射。

## 口径（与规格一致，其余写进 thresholds）

| 量 | 定义 |
|---|---|
| 层 | 该小节里至少有一个音的轨道数。`FX`、`CHOP` 不算 |
| 小节能量 | `层数 × 音区权重 × 平均力度`。最低音 `< 60` 权重 1.0，`60–79` 为 0.6，`≥ 80` 为 0.4 |
| 抬一层 | 副歌平均能量 ≥ 主歌平均能量 × 1.5，且副歌平均层数 ≥ 主歌平均层数 + 1 |
| 在调内 | 该小节每个音级都在目标调的音阶里。`allowBorrowed` 为真时，整小节能匹配成罗马数字带 `♭` 或 `iv` 的和弦也算合法 |
| 低频冲突 | 这一小节里 808 的最低音 `< 33`，且同一小节有 kick |
| 和弦色彩 | 相邻小节音级集合的 Jaccard `> 0.75` |
| 中频打架 | 两条非装饰轨的力度加权频率重心都落在 250–2000 Hz，且相差 `< 150 Hz`。定位到两轨同时发声的第一小节 |
| 失去新鲜感 | 同一个音级集合连续重复达到 4 小节，定位到这一串的第 4 小节 |

段落名：`Verse` / `主歌` 是主歌，`Chorus` / `副歌` 是副歌。

## 文件

| 文件 | 职责 |
|---|---|
| `src/core/analyze/thresholds.ts` | 上表里的数字 |
| `src/core/analyze/song.ts` | `AnalysisSong`、按小节切片 |
| `src/core/analyze/energy.ts` | 每小节层数与能量 |
| `src/core/analyze/rules/*.ts` | 六条规则 |
| `src/core/analyze/fixtures.ts` | 构造样例 |
| `src/ui/DiagnosticsLab.tsx` | 样例、SVG 曲线、诊断列表 |
| `tests/analyze/rules.test.ts` | 每条规则至少一个正例和一个反例 |

## 任务

- [x] 阈值、歌曲切片、能量函数，单测能量数字。
- [x] 六条规则接到 `runDiagnostics`，每条用构造样例断言 `id` 和 `bar`。
- [x] 「诊断」页默认为「副歌没抬层」，能看到折线和至少一条诊断。
- [x] `npm test` 与 `npm run typecheck` 通过。第 1 关测试仍然通过。
