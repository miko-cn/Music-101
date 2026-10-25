# Cubase 13 MIDI 导入验证（2026-10-20）

输入文件：`out/music101-test.mid`（150 BPM，F# 小调，8 小节，i–♭VI–IV–I）

生成命令：`npm run make:midi`。本次生成结果 1550 字节，文件头 `MThd`。

## 环境

文件自检最早一次是在没有 Cubase 的机器上做的。2026-10-20 在这台 Windows 上补了实机：

- Cubase 13：`D:\Production\Cubase 13\Cubase13.exe`，进程标题先是 `Cubase Pro Hub`，导入后是 `Cubase Pro 工程 - music101-test`
- 操作用本机 cua-driver 0.36.0。Hub 菜单实际路径是「文件 → 导入 → MIDI 文件...」，对话框标题是英文 `Import MIDI File`
- 导入前 Cubase 要求选择工程文件夹。没有用 Hub 里打开的现有曲目目录，新建的是 `out/cubase-check/m5-project`（`out/` 已被 gitignore）
- 工程当时没有保存成 `.cpr`。关掉 Cubase 时如果询问保存，应留在这个目录，不要另存进其他曲目文件夹

下表的「文件自检」仍是 `readMidiFile` 读回 `out/music101-test.mid`。Cubase 列来自轨道列表、走带条、标记窗口（工程 → 标记）和双击 `CHORDS` 后打开的钢琴卷帘。

## 对照

| 检查项 | 期望 | 文件自检 | Cubase 实测 |
|---|---|---|---|
| 轨道名 | Music-101 / KICK / 808 / BASS / SUPERSAW / CHORDS | 读回顺序一致 | 轨道列表有 `KICK`、`808`、`BASS`、`SUPERSAW`、`CHORDS`。没有名叫 `Music-101` 的轨；这个名字在文件里是只含速度和标记的指挥轨 |
| 速度 | 150.00 BPM | tempo 事件 `microsecondsPerBeat = 400000`（60_000_000 / 150） | 走带条显示 `150.000`，拍号 `4/4` |
| 段落标记 | Intro / Verse / PreChorus / Chorus | 分别在 tick 0 / 3840 / 7680 / 11520 | 标记窗口有这四条，位置是 Cubase 的 1 起小节：`Intro` 在 1.1.1.0，`Verse` 在 3.1.1.0，`PreChorus` 在 5.1.1.0，`Chorus` 在 7.1.1.0 |
| 和弦标记 | F#m (i) / D (♭VI) / B (IV) / F# (I) | 与对应段落标记同一 tick，文本一致（含 `♭`） | `F#m (i)`、`B (IV)`、`F# (I)` 位置正确。`D (♭VI)` 在标记窗口里显示成 `D (鈾璙I)`：Cubase 按系统 ANSI（这台机器是 GBK）读 marker 文本，不按 UTF-8 |
| 小节数 | 8 | 最后事件 tick = 15360 = 8 × 4 × 480，即第 8 小节结束；没有更晚的 noteOn | 选中的 `CHORDS` 片段信息是位置 1.1.1.0、长度 8.0.0.0。卷帘标尺能看到第 8 小节。工程网格在第 8 小节之后还有空小节，工程总长没有卡死在 8 |
| 和弦轨 | CHORDS 轨每小节 3 个音 | 第 0–7 小节各有 3 个 noteOn，音高互不相同 | 钢琴卷帘标题是 `CHORDS`。第 1–8 小节各有一组叠在一起的三个音，每两小节换一组。音名没有从钢琴键盘上逐个读实 |

同一套文件断言在 `tests/midi/demo.test.ts`。

导入没有弹出量化对话框。卷帘里的音贴着小节线。

## 和上一版演示文件的差别

规格 3.7 要求 `CHORDS` 轨每小节放一个三和弦的三个音高。计划任务 8 的初稿只在每个和弦的第一小节放音，第二小节是空的。现在每个和弦仍只在起始小节写一次 Marker，后一小节用 `omitMarker` 接着铺同一组三个音。Cubase 标记窗口也是这个样子：段落名和和弦名各出现一次，不是每小节重复。

## 只含和弦名的 FF 06 文件

`out/chord-only.mid` 只有一条轨：速度 150、轨名 `ChordsOnly`，以及四个 marker，没有音符，也没有 Intro / Verse 这类段落名。

| tick | 文本 |
|---|---|
| 0 | F#m (i) |
| 1920 | D (♭VI) |
| 3840 | B (IV) |
| 5760 | F# (I) |

在已经打开的 `m5-test-import-midi` 里选「不创建新工程」后导入。结果：

- 没有出现 Chord 轨，轨道列表仍是原来的 `KICK` / `808` / `BASS` / `SUPERSAW` / `CHORDS`
- 四个和弦名进了标记窗口，新 ID 是 9–12，位置分别是 1.1.1.0、2.1.1.0、3.1.1.0、4.1.1.0
- 随后用「编辑 → 撤销 导入 MIDI」撤掉了这次导入，原来的 8 条标记还在

Cubase 13 把 FF 06 的和弦名当成标记，不把它认成 Chord 轨。Steinberg 文档里能进 Chord Data 轨的是 Yamaha XF，不是这个 meta 事件。

## 结论

Cubase 13 能导入 `music101-test.mid`。五条有音符的轨、150 BPM、四段段落标记和四条和弦标记都进了工程，`CHORDS` 在卷帘里是每小节三个音。ASCII 标记正常。`♭` 的 UTF-8 字节 `E2 99 AD` 再带上后面的 `V`（`56`），按 GBK 变成 `鈾璙`，后面的 `I` 还在，所以当时的画面是 `D (鈾璙I)`。写出端现在把 marker 里的 `♭` 换成 ASCII `b`。把只含 `D (♭VI)` 的文件再导入一次，标记窗口新行显示 `D (bVI)`，随后撤销了这次导入。界面上的罗马数字仍然用 `♭`。已经打开的工程里 ID 4 仍是改写之前导入的 `D (鈾璙I)`，要换成 `bVI` 需要重新导入。

轨道列表里看不到指挥轨名 `Music-101`。工程网格比 8 小节长，多出来的是空小节。只含和弦名的 FF 06 文件不会生成 Chord 轨。Studio One 5 按决定先不做。
