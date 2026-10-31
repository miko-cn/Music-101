# Music-101

kawaii bass / future bass 编曲速成课。零后端、零账号、零采样文件——所有声音由浏览器实时合成。
面向零乐理基础的业余编曲者（Cubase 13 + Studio One 5），每天 15–30 分钟碎片时间。

技术栈：Vite + React 19 + TypeScript + antd v6 + 原生 Web Audio API。
运行时依赖只有 4 个：`antd` `motion` `react` `react-dom`。

## 动手前先读这个

**规格文档是唯一真相源**：`docs/superpowers/specs/2026-10-20-music-101-design.md`（820 行）。

改任何东西之前先定位到相关章节再动手，别凭印象：

| 你要改的东西 | 看这几节 |
|---|---|
| 课程内容、关卡结构、文案写法 | §3.1 §3.2 §3.9 |
| 诊断规则、个性化 | §3.3 §3.4 §3.10 |
| 声音引擎、参考曲分析、MIDI 导出 | §3.5 §3.6 §3.7 |
| 记谱渲染、教学图 | §3.8 §3.11 |
| 间距、配色、字体 | §3.12 §3.13 §3.14 |
| 模块边界、数据流、状态持久化 | §4.2 §4.3 §4.4 |
| 不能越过的产品边界 | §1.3 §6 |

改动如果推翻了已有决策，**改规格 + 改代码一起做**，别只改一边。

## 硬约束（违反了会出事）

- **运行时零外部请求**：字体、图标、音频全部自托管在 `public/`。
  任何 CDN / 远程字体 / 远程音频都算破坏约束（见 §6）。
- **不新增运行时依赖**：现有 4 个够用。要加新的先想清楚能不能用标准库做。
- **`src/core/` 是纯逻辑**：除 `core/audio`（唯一接触 Web Audio 的模块）外，
  都是不碰 DOM、不碰 Web Audio 的纯函数，可单测。
- **`src/content/` 是纯数据**：不 import React、不 import `ui/` 的组件。
  教学图由内容层只声明「图种 + 图注 + 数据」，UI 层负责画（见 §3.11）。
- **配色只有一处定义**：`src/ui/theme.ts`。不许在组件里写死颜色，
  antd token 要映射全，半自定义半默认一定走样（见 §3.13）。
- **字体是裁剪版**：改过 `src/**` 里的文案后跑 `npm run make:font` 重新裁剪，
  否则新字不在子集里会掉回系统字体。`npm run build` 会拦（见 §3.14）。
- **页面级间距归 `.page` 的 flex gap**：别再往子元素上补 margin，
  gap 和 margin 会叠加（见 §3.12）。

## 目录地图

```
src/core/      纯逻辑：theory audio midi analyze lesson sequencer reference
src/content/   关卡内容：一关一个文件，lessons/ + 共享类型
src/ui/        React 组件与主题
tests/         Vitest 单测，按模块分目录
scripts/       构建期脚本（字体裁剪、测试素材生成）
public/fonts/  自托管字体与许可
```

## 命令

```bash
npm run dev        # 本地开发
npm run typecheck  # tsc --noEmit
npm test           # Vitest 全量
npm run build      # = font:check && tsc --noEmit && vite build
npm run make:font  # 重新裁剪主界面字体（改了文案后跑）
```

`npm run build` 前置了字体子集校验，字体过期会直接构建失败——这是故意的。

## 提交与部署

- 提交信息用 Conventional Commits + 中文描述。
- 部署：`website_deploy`，`path` 指向 `dist/`，`source_path` 指向仓库根，
  `project_name` = `Music-101`，**同一个站点原地更新**（node_id `456257397109275`）。
- 部署前源码目录总量要小于 200MB：`node_modules/` 会被排除，但 `out/` 不会，
  大文件别放仓库里的临时目录。
