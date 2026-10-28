// 第 25 关 · 副歌抬一层
import { defineLesson, notesAt, kicks, track, choice, ear, BAR } from "../helpers.ts";
import type { StageLessonEntry } from "../types.ts";

export const lesson: StageLessonEntry = defineLesson({
  id: 25,
  title: "副歌抬一层",
  stage: "style",
  ability: "structure",
  anchor: {
    id: "add-a-track",
    name: "加轨 + 1.5 倍",
    hook: "主歌留两层，副歌加一条 supersaw，能量到 1.5 倍。",
    steps: [
      "主歌：kick + 贝斯。",
      "副歌：加一条 supersaw 轨。",
      "层数多 1，同时平均能量 ≥ 主歌的 1.5 倍。",
      "kick 不删——节奏底盘要留着，上面再加层。",
    ],
    takeaway: [
      "抬层 = 多一条真实轨。",
      "能量倍数和层数两条同时达标。",
      "4 小节主歌之后，副歌从第 5 小节开始。",
      "主歌的 kick 要保留。",
    ],
  },
  mistakeKinds: { 1: "chorus-flat" },
  marker: "Level25",
  totalBars: 8,
  showEnergy: true,
  prereq: [13, 22],
  sections: [
    { name: "Verse", startBar: 0, bars: 4 },
    { name: "Chorus", startBar: 4, bars: 4 },
  ],
  concept: [
    "抬一层不是把副歌的音量旋钮拧大一点就算完。层数要多一条，能量还要到主歌的 1.5 倍。",
    "具体做法：主歌留 kick 和贝斯，副歌加上 supersaw。曲线从第 5 小节抬上去，才算副歌。",
    "为什么必须是「加轨」而不是「加音量」：加音量让副歌和主歌一起变响，两段的差别被抹平；加轨让副歌多出主歌没有的东西，差别才被听见。",
    "加哪一条也要选：supersaw 是中频偏上，铺和弦最直接；chop 是节奏性的细节，层数加了但能量贡献小。抬层的主力应该是 supersaw。",
    "反过来的错误是「主歌留太多」。如果主歌已经有 kick、贝斯、supersaw，副歌就无处可加，只能靠力度硬推。所以主歌要主动留空。",
  ],
  ear: [
    ear("what-add", "副歌具体加上什么？", "一条新的和弦轨", "把主歌音量调小", "加层是多一条轨，不是把主歌变小声。", [36, 48, 72], [36, 48], { label: "把 kick 删掉", midis: [48, 72] }, { wrongHint: "别盯着音量旋钮，先数一数主歌和副歌各跑了几条轨。", encourage: "对，副歌是加了一条新的和弦轨，不是把主歌调小。" }),
    ear("both", "哪一段同时满足能量和层数？", "后半又厚又多层", "后半只是同一个音更密", "1.5 倍能量，并且层数多 1。", [36, 48, 36, 48, 72], [48, 48, 48, 48], { label: "后半把层拿掉", midis: [36] }, { wrongHint: "抬层有两条硬指标，要同时成立；只变密不算抬起来。", encourage: "对，又厚又多层才算抬层。" }),
    ear("where-bar", "哪一段是前四下主歌、后面才抬？", "先薄后厚", "一开头就很厚", "前四小节是主歌，第五小节进副歌。", [48, 48, 48, 48, 36, 48, 72], [36, 48, 72, 36, 48, 72], { label: "一直很薄", midis: [48, 48, 48, 48] }, { wrongHint: "先数前半有几下还在收着，抬层应该接在主歌后面。", encourage: "对，主歌走完才抬，台阶在后半。" }),
    ear("chart", "哪条曲线在副歌明显升高？", "后半突然变厚", "一直平着", "平的曲线就是没抬。", [48, 48, 36, 48, 72], [48, 48, 48, 48], { label: "先厚后薄", midis: [72, 72, 36, 36] }, { wrongHint: "把前后两半的厚度对一下，副歌那段应该上台阶。", encourage: "对，副歌那段变厚，曲线才看得出抬层。" }),
    ear("keep-kick", "主歌的 kick 到了副歌？", "还在", "必须删掉", "节奏底盘留着，上面再加层。", [36, 48, 36, 48, 72], [48, 72], { label: "换成 808", midis: [36, 36] }, { wrongHint: "把主歌和副歌的低音对一下，看底盘是一直在还是中途换掉了。", encourage: "对，副歌沿用主歌的 kick，节奏底盘一直在。" }),
    ear("vel-only", "哪一段只是变响、没有加层？", "同一个音变得更密", "后半多了一条高音", "层数没变就不算抬层，只是变响。", [48, 48, 48, 48], [48, 48, 72], { label: "后半把底盘拿掉", midis: [72] }, { wrongHint: "对照抬层那两条硬指标，看看哪一段层数其实没变。", encourage: "对，只变密就是变响，不算抬层。" }),
  ],
  handPrompt: "选出副歌加了一层的版本。",
  handChoices: [
    choice("副歌加上 supersaw", [], [], [
      track("KICK", 9, kicks(8)),
      track("BASS", 0, notesAt([0, 1, 2, 3, 4, 5, 6, 7], 48, 80, BAR - 20)),
      track("SUPERSAW", 2, notesAt([4, 5, 6, 7], 72, 100)),
    ]),
    choice("副歌和主歌完全一样", [], [], [
      track("KICK", 9, kicks(8)),
      track("BASS", 0, notesAt([0, 1, 2, 3, 4, 5, 6, 7], 48, 80, BAR - 20)),
    ]),
  ],
  handCorrect: 0,
  layerStack: [
    {
      title: "主歌",
      layers: [
        { name: "kick", note: "节奏底盘" },
        { name: "贝斯", note: "接住根音" },
      ],
    },
    {
      title: "副歌",
      layers: [
        { name: "kick", note: "沿用主歌" },
        { name: "贝斯", note: "沿用主歌" },
        { name: "supersaw 和弦", added: true, note: "加一条轨 = 抬层" },
      ],
    },
  ],
  diagrams: [
    {
      kind: "layer-stack",
      caption:
        "抬层 = 多一条真实轨道，不是把音量拧大。加音量让副歌和主歌一起变响，差别被抹平；加轨让副歌多出主歌没有的东西，差别才被听见。所以主歌要主动留空。",
    },
  ],
});
