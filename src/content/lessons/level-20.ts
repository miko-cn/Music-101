// 第 20 关 · 动态
import { defineLesson, notesAt, track, choice, ear } from "../helpers.ts";
import type { StageLessonEntry } from "../types.ts";

export const lesson: StageLessonEntry = defineLesson({
  id: 20,
  title: "动态",
  stage: "arrangement",
  ability: "structure",
  anchor: {
    id: "velocity-breath",
    name: "力度差 = 呼吸",
    hook: "主歌收着，副歌推上去，全程一样就是不呼吸。",
    steps: [
      "力度写在每个音符的 velocity 上。",
      "主歌先放 70 左右的力度，留住余地。",
      "副歌推到 110 左右。",
      "力度曲线要看得见台阶，不是平滑直线。",
    ],
    takeaway: [
      "力度 = 音符的 velocity。",
      "主歌留余地，副歌推上去。",
      "全程同力度 = 动态是平的。",
      "力度也是能量公式里的一项。",
    ],
  },
  marker: "Level20",
  totalBars: 8,
  prereq: [13],
  sections: [
    { name: "Verse", startBar: 0, bars: 4, velocity: 70 },
    { name: "Chorus", startBar: 4, bars: 4, velocity: 110 },
  ],
  concept: [
    "力度让歌呼吸。主歌收着点，副歌推上去。全程同一个力度，段落会糊成一条直线。",
    "这里先把主歌力度放在 70，副歌放到 110。层可以先不变，单靠力度也能让曲线动起来。",
    "力度和层数的分工：层数决定「多了什么」，力度决定「多响」。如果一层都没有，力度调满也只是同一首歌变吵；反过来，层加对了但力度一样，动态还是平的。所以两个要一起动。",
    "为什么主歌要「收着」而不是和副歌一样：留余地才能推得上去。全程顶满的副歌听不出副歌，因为没有对比就没有参照。",
    "力度写在每个音符的 velocity 上，导出到 Cubase 后依然保留——所以这是少数几个能直接带进工程继续调的东西。",
  ],
  ear: [
    ear("verse-vel", "主歌力度更适合？", "收一点，大约 70", "从头到尾 127", "主歌留着余地，副歌才推得上去。", [70], [127], { label: "40", midis: [40] }, { wrongHint: "先分清这段是主歌还是副歌，再想想它要给后面的段落留多少余地。", encourage: "对，主歌收在 70 左右，副歌才推得上去。" }),
    ear("chorus-vel", "副歌力度相对主歌？", "更大", "更小", "副歌是要出来的那一段。", [110], [70], { label: "一样", midis: [90] }, { wrongHint: "把副歌和主歌的力度值各读一遍，比大小，别凭感觉。", encourage: "对，副歌力度更大，它才是要出来的那一段。" }),
    ear("flat", "全程力度一样，听感是？", "不呼吸", "自动有段落", "力度不变，动态就是平的。", [90], [90], { label: "更厚", midis: [90] }, { wrongHint: "别靠印象，把每个小节的力度值写出来，看这条曲线有没有高低起伏。", encourage: "对，力度不变，动态就是平的，歌不会呼吸。" }),
    ear("not-only", "力度是能量公式里的哪一项？", "平均力度", "层数本身", "能量是层、音区、力度乘在一起。", [90], [90], { label: "音区权重", midis: [90] }, { wrongHint: "先把能量公式的三个因子写出来，再对号入座。", encourage: "对，能量是层数、音区、力度相乘，力度算的是平均力度。" }),
    ear("where", "力度写在 MIDI 的哪里？", "音符的 velocity", "Marker 文本", "每个音自己带力度。", [90], [90], { label: "tempo", midis: [90] }, { wrongHint: "先想清楚力度是逐个音记录的，还是整段共享一个设置。", encourage: "对，力度写在每个音符自己的 velocity 上。" }),
    ear("ratio-vel", "力度从 70 提到 110，大约是几倍？", "约 1.6 倍", "正好 2 倍", "110 除以 70 约等于 1.57，也就是约 1.6 倍。", [110], [140], { label: "约 1.2 倍", midis: [140] }, { wrongHint: "别凭眼睛估，把两个力度值相除，看商落在哪两个数之间。", encourage: "对，110 除以 70 约 1.57，差不多 1.6 倍。" }),
  ],
  handPrompt: "选出主歌轻、副歌重的力度。",
  handChoices: [
    choice("主歌 70，副歌 110", [], [], [
      track("BASS", 0, [...notesAt([0, 1, 2, 3], 48, 70), ...notesAt([4, 5, 6, 7], 48, 110)]),
    ]),
    choice("全程 90", [], [], [track("BASS", 0, notesAt([0, 1, 2, 3, 4, 5, 6, 7], 48, 90))]),
  ],
  handCorrect: 0,
  diagrams: [
    {
      kind: "dynamic-curve",
      caption:
        "力度写在每个音符的 velocity 上。主歌放 70 留住余地，副歌推到 110——曲线要看得见台阶，不是平滑直线。全程顶满的副歌听不出副歌，因为没有对比就没有参照。",
    },
  ],
});
