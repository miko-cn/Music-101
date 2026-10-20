# Cubase 13 MIDI 导入验证（2026-10-20）

输入文件：`out/music101-test.mid`（150 BPM，F# 小调，8 小节，i–♭VI–IV–I）

生成命令：`npm run make:midi`。本次生成结果 1550 字节，文件头 `MThd`。

## 环境

这次核对跑在 Linux 上，系统里没有 `Cubase13.exe`，也没有计划里写的 cua-driver。任务 10 的步骤 1–4（启动 Cubase、打开「导入 MIDI 文件」、填路径、对着工程窗口截图）没有执行。

下表的「文件自检」是用本仓库的 `readMidiFile` 读回 `out/music101-test.mid` 得到的，不是 Cubase 画面。Cubase 列全部是「未测」。

## 对照

| 检查项 | 期望 | 文件自检 | Cubase 实测 |
|---|---|---|---|
| 轨道名 | Music-101 / KICK / 808 / BASS / SUPERSAW / CHORDS | 读回顺序一致 | 未测 |
| 速度 | 150.00 BPM | tempo 事件 `microsecondsPerBeat = 400000`（60_000_000 / 150） | 未测 |
| 段落标记 | Intro / Verse / PreChorus / Chorus | 分别在 tick 0 / 3840 / 7680 / 11520 | 未测 |
| 和弦标记 | F#m (i) / D (♭VI) / B (IV) / F# (I) | 与对应段落标记同一 tick，文本一致（含 `♭`） | 未测 |
| 小节数 | 8 | 最后事件 tick = 15360 = 8 × 4 × 480，即第 8 小节结束；没有更晚的 noteOn | 未测 |
| 和弦轨 | CHORDS 轨每小节 3 个音 | 第 0–7 小节各有 3 个 noteOn，音高互不相同 | 未测 |

同一套断言在 `tests/midi/demo.test.ts`。`npm test` 本次为 10 个文件、58 个用例通过。

## 和上一版演示文件的差别

规格 3.7 要求 `CHORDS` 轨每小节放一个三和弦的三个音高。计划任务 8 的初稿只在每个和弦的第一小节放音，第二小节是空的。现在每个和弦仍只在起始小节写一次 Marker，后一小节用 `omitMarker` 接着铺同一组三个音。

## 结论

Cubase 13 实机导入没有做。轨名、速度、段落标记在 Cubase 里是否按上面的文本显示，还要在装有 Cubase 13 的机器上导入 `out/music101-test.mid` 后再填「Cubase 实测」列。文件层面能离线核对的项已经对上计划检查表。
