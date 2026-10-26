// 第 18 关 · 音色角色与频段
import { defineLesson, notesAt, track, choice, ear } from "../helpers.ts";
import type { StageLessonEntry } from "../types.ts";

export const lesson: StageLessonEntry = defineLesson({
  id: 18,
  title: "音色角色与频段",
  stage: "arrangement",
  ability: "arrangement",
  anchor: {
    id: "rank-by-register",
    name: "从低到高排队",
    hook: "kick 最低，贝斯次低，和弦再往上——各占一段。",
    steps: [
      "先给每条轨定角色。",
      "kick 占最低，贝斯往上一点，supersaw 再往上。",
      "两条轨音高太近 → 频率重心撞在一起，中频打架。",
      "FX 和 CHOP 是装饰轨，不参加频段比较。",
    ],
    takeaway: [
      "kick < 贝斯 < supersaw 是默认站位。",
      "两条轨音高一样 = 重心撞在一起。",
      "中频糊 = 大家都挤在中央 C 附近。",
      "频段规则排除装饰轨。",
    ],
  },
  marker: "Level18",
  totalBars: 1,
  prereq: [14],
  concept: [
    "kick 待在最低的地方，贝斯在它上面一点，supersaw 再往上。每条轨有自己的频段。",
    "如果大家都挤在中央 C 附近，中频会糊。频率重心离得太近，诊断就会说它们打架。",
    "为什么中频最危险：中频（约 200–2000Hz）是大多数人声和主旋律所在的区域，这个区间一旦被两三个东西同时占满，听觉就分不出层次，只能听到一团「嗡嗡的中间」。",
    "解决的办法不是把某个音调高，而是分工：kick 只管 60Hz 以下的冲击，808 只管 40–60Hz 的持续根音，贝斯走 80–200Hz，supersaw 走中频以上往上。层数可以多，但同一个频段里别放两个角色。",
    "检查方法：把每条轨单独静音听一遍。如果去掉任何一条你都没感觉，那条轨可能和别人重叠了。",
  ],
  ear: [
    ear("kick-band", "kick 该待在哪？", "最低", "和主旋律同一个八度", "踢是低频的冲击，不跟旋律抢位置。", [36], [60], { label: "最高", midis: [84] }),
    ear("saw-band", "supersaw 更适合哪？", "中高频", "和 kick 同一个音", "锯齿铺的是和弦的中高频。", [72], [36], { label: "最低", midis: [24] }),
    ear("same-note", "两条轨都只弹 MIDI 60，容易怎样？", "挤在中频", "自动分成高低", "音高一样，重心就挨在一起。", [60, 60], [60], { label: "没有影响", midis: [60] }),
    ear("role", "贝斯的角色是？", "接在 kick 上面的根音", "代替踩镲", "贝斯管和声的低音，不管节奏的帽子。", [48], [42], { label: "负责高频", midis: [84] }),
    ear("count", "频段规则会拿掉哪类轨？", "FX 和 CHOP", "BASS", "装饰轨不参加频段比较。", [72], [48], { label: "KICK", midis: [36] }),
    ear("kick-bass-close", "kick 和贝斯都在 MIDI 36 附近，会怎样？", "低频互相盖住", "完全正常", "两个角色挤在同一段低频，鼓点和根音会糊。", [36, 36], [36], { label: "低频会厚一点", midis: [36] }),
  ],
  handPrompt: "选出频段分开的编配。",
  handChoices: [
    choice("kick 低，supersaw 高", [], [], [
      track("KICK", 9, [{ tick: 0, dur: 120, pitch: 36, vel: 110 }]),
      track("SUPERSAW", 2, notesAt([0], 76, 80)),
    ]),
    choice("贝斯和 supersaw 都弹 MIDI 60", [], [], [
      track("BASS", 0, notesAt([0], 60)),
      track("SUPERSAW", 2, notesAt([0], 60)),
    ]),
  ],
  handCorrect: 0,
  frequencyBands: {
    axis: { min: 20, max: 20000 },
    zone: { from: 200, to: 2000, label: "中频 200–2000Hz：人声和主旋律的地盘" },
    bands: [
      { label: "踢 kick", role: "kick", from: 0, to: 60, note: "只管冲击", demoMidi: 33 },
      { label: "808", role: "sub", from: 40, to: 60, note: "只管持续根音", demoMidi: 29 },
      { label: "贝斯 BASS", role: "bass", from: 80, to: 200, note: "低频旋律", demoMidi: 43 },
      { label: "SUPERSAW", role: "supersaw", from: 2000, to: 8000, note: "中频以上", demoMidi: 96 },
    ],
  },
  diagrams: [
    {
      kind: "frequency-bands",
      caption:
        "每个角色占一段频率：kick 只管 60Hz 以下的冲击，808 管 40–60Hz 的持续根音，贝斯走 80–200Hz，supersaw 在中频以上。同一个频段里别放两个角色。点一条能听个大概音高（示例音只是音高参考，不等于频谱）。",
    },
  ],
});
