// 第 11 关 · 808 和 kick 的分工
import { defineLesson, notesAt, kicks, track, choice, ear, BAR } from "../helpers.ts";
import type { StageLessonEntry } from "../types.ts";

export const lesson: StageLessonEntry = defineLesson({
  id: 11,
  title: "808 和 kick 的分工",
  stage: "arrangement",
  ability: "arrangement",
  anchor: {
    id: "short-long-split",
    name: "长短分工 + 低频不重叠",
    hook: "kick 管冲击，808 管根音；两者别挤在同一段低频。",
    steps: [
      "kick = 短、瞬态、冲击。",
      "808 = 长、根音、持续低频。",
      "808 最低音低于 MIDI 33 且同一小节有 kick → 低频冲突。",
      "把根音放在 MIDI 36 附近，把更低的区间留给 kick 的瞬态。",
    ],
    takeaway: [
      "kick 短，808 长。",
      "808 跟根音走，kick 跟拍子走。",
      "低频冲突 = 太低 + 同小节有 kick，两个条件同时成立。",
      "根音放 MIDI 36 附近最稳。",
    ],
  },
  mistakeKinds: { 1: "low-end-clash" },
  fixes: [{ kind: "low-end-clash", advice: "根音放在 MIDI 36" }],
  marker: "Level11",
  totalBars: 2,
  prereq: [10],
  concept: [
    "kick 要短，占的是一下一下的冲击。808 要长，占的是根音那条持续的低频。",
    "808 如果低到 MIDI 33 以下，又和 kick 落在同一小节，低频会糊成一块。根音放在 36 附近，把更低的位置留给 kick 的瞬态。",
    "为什么这个界限是 33：MIDI 33 大约是 43Hz。低于这个频率，人耳基本听不出音高，只感觉到「轰」，而鼓和贝斯的瞬态都挤在这段最容易被糊掉的低频里。",
    "分工的实际收益：kick 打的是「点」，808 打的是「线」。两个都在低频但时值不同，叠在一起才有「又厚又跳」；两个都用长音，低频就只会互相抵消。",
    "编曲里的检查清单：听一遍低频，如果鼓点糊成一团、听不出每个 kick 的位置，就是 808 太低或者两者太贴。",
  ],
  ear: [
    ear("who-short", "哪个该是短音？", "kick", "808", "kick 负责冲击，时值短。808 负责根音，时值长。", [36], [36], { label: "两个都一样", midis: [36] }, { wrongHint: "别看谁更响，先想哪一件是一次性的一下，哪一件要一直垫着。", encourage: "对，kick 是短促冲击，808 的音长跟着根音走。" }),
    ear("who-root", "哪个负责和弦根音？", "808", "hat", "808 跟着和声的根音走，帽子只负责节奏。", [36], [42], { label: "kick", midis: [36] }, { wrongHint: "先问自己：和声的根音是从哪一件发出来的。", encourage: "对，808 跟着根音走，帽子只管节奏。" }),
    ear("too-low", "808 低到多少开始容易和 kick 打架？", "MIDI 33 以下", "MIDI 60 以上", "低于 MIDI 33 大约就是 45Hz 以下。", [33], [60], { label: "MIDI 48 以下", midis: [48] }, { wrongHint: "把 MIDI 音高换成实际频率，从能听清的低音往上推那条警戒线。", encourage: "对，落到 MIDI 33 以下就容易和底鼓抢位置。" }),
    ear("same-bar", "低频冲突还要满足什么？", "同一小节里也有 kick", "只要 808 很低就一定冲突", "低，并且跟 kick 叠在同一小节，才算冲突。", [28, 36], [28], { label: "必须换 BPM", midis: [28] }, { wrongHint: "低只是第一个条件，再看这条低频有没有和别的低频撞在同一时间点上。", encourage: "对，又低又和底鼓撞在同一小节，才算真的打架。" }),
    ear("pitch-36", "根音放在 MIDI 36，算不算已经低到冲突线以下？", "不算", "算", "36 比 33 高，还在可用的根音区。", [36], [28], { label: "刚好在边界", midis: [33] }, { wrongHint: "把 36 和那条低频警戒线比一比，看它在线的上面还是下面。", encourage: "对，36 还在警戒线上方，根音区是能用的。" }),
    ear("both-36", "808 和 kick 都用 MIDI 36，会怎样？", "低频会糊", "完全没问题", "音高一样又同时响，低频重心叠在一起，听起来糊成一团。", [36, 36], [36, 36], { label: "只是低频厚一点", midis: [36, 36] }, { wrongHint: "想一下两件鼓同时在同一个音高上响，低频的重心会叠成什么样。", encourage: "对，音高一样又同时响，低频会糊成一团。" }),
  ],
  handPrompt: "选出分工清楚的一对。",
  handChoices: [
    choice("kick 短，808 在 MIDI 36 拉长", [], [], [
      track("KICK", 9, kicks(2)),
      track("808", 0, notesAt([0, 1], 36, 100, BAR - 20)),
    ]),
    choice("808 降到 MIDI 28，还和 kick 叠在一起", [], [], [
      track("KICK", 9, kicks(2)),
      track("808", 0, notesAt([0, 1], 28, 100, BAR - 20)),
    ]),
    choice("两件都打成十六分音符", [], [], [
      track("KICK", 9, kicks(2)),
      track("808", 0, kicks(2).map((note) => ({ ...note, pitch: 36 }))),
    ]),
  ],
  handCorrect: 0,
  frequencyBands: {
    axis: { min: 20, max: 200 },
    zone: { from: 20, to: 45, label: "808 别待在这：低于约 43Hz" },
    bands: [
      { label: "kick 瞬态", role: "kick", from: 20, to: 45, note: "短，一下一下", demoMidi: 24 },
      { label: "808 根音", role: "808", from: 45, to: 120, note: "长，跟根音走", demoMidi: 36 },
    ],
  },
  diagrams: [
    {
      kind: "frequency-bands",
      caption:
        "分工是「谁待在哪」：kick 的瞬态留在最低的那段，808 的根音放在 MIDI 36 附近（约 65Hz）。808 掉进 43Hz 以下又和 kick 同小节，低频就糊成一块。点一条能听那个音高。",
    },
  ],
});
