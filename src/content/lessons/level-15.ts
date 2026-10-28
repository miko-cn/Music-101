// 第 15 关 · 和声功能：T / S / D
import { defineLesson, chord, choice, ear } from "../helpers.ts";
import type { StageLessonEntry } from "../types.ts";

export const lesson: StageLessonEntry = defineLesson({
  id: 15,
  title: "和声功能：T / S / D",
  stage: "arrangement",
  ability: "harmony",
  anchor: {
    id: "function-t-s-d",
    name: "功能三分",
    hook: "I 主 IV 下 V 属，V 要回家。",
    steps: [
      "先认功能：I 和 vi 是 T（主），ii 和 IV 是 S（下属），V 和 vii° 是 D（属）。",
      "T 稳定，停在这儿也行；S 铺垫，承上启下；D 悬着，必须往下解决。",
      "名字的来历：IV 建在下属音上，所以叫下属；V 建在属音上，所以叫属。",
      "一段里必须落回一次 T，否则整段都是悬着的。",
      "连续两个 S 会平，连续两个 D 会慌。",
    ],
    takeaway: [
      "I / vi = T（主），ii / IV = S（下属），V / vii° = D（属）。",
      "V 想解决到 I——这个「想」就是 D 功能本身。",
      "一个循环至少要有一次 T 落地。",
      "S 接 S 会平，D 接 D 会慌。",
    ],
  },
  marker: "Level15",
  totalBars: 4,
  prereq: [14, 7],
  concept: [
    "同样的和弦，作用可能完全不同。C 大调里的 C 和 G 都是大三和弦，但一个让你安心，一个让你坐不住。区别不在音色，在它想往哪走——这就叫和声功能。",
    "三个功能：T（主）、S（下属）、D（属）。T 是主和弦，稳定，停在这儿也行；S 是下属和弦，铺垫，承上启下；D 是属和弦，不稳定，必须往下解决。",
    "对应到级数：I 和 vi 是 T，ii 和 IV 是 S，V 和 vii° 是 D。就这七个和弦，分成三堆。",
    "名字的来历：IV 是第四级，建在下属音上，所以叫下属和弦；V 是第五级，建在属音上，所以叫属和弦。「下」和「属」说的是它们跟主音的距离。",
    "为什么下属想往上、属想往下：IV 在主音下方五度，天然想把主音托上来；V 在主音上方五度，天然想掉回主音。一个托、一个掉——「回家」这个感觉就是这么来的。",
    "一段最常见的功能顺序是 T → S → D → T：先稳定，铺垫，悬起来，最后落地。这就是「起承转合」在和声上的对应。两个常见错误是连续两个 S（听着像没推进）和连续两个 D（一直悬着，没有安全感）。",
    "编曲里的用处：副歌每一句都要有一次 T 落地，否则听感上副歌没有终点；把 D 放在句尾前一个位置，句子就有推力了。",
  ],
  ear: [
    ear("fn-dominant", "C 大调里哪个和弦是 D（属）功能？", "G B D", "F A C", "G 是第 5 级，属和弦。F 是第 4 级（下属），A 是第 6 级（主）。", [67, 71, 74], [65, 69, 72], { label: "A C E", midis: [69, 72, 76] }, { wrongHint: "先按级数把三个选项排到调内的位置，再看哪个建在属音上。", encourage: "对，G B D 建在第 5 级，是 D（属）功能。", blind: true }),
    ear("fn-tonic", "哪个是 T（主）功能？", "C E G", "D F A", "C 是主和弦。Dm（ii）也是主功能，F（IV）是下属。", [60, 64, 67], [62, 65, 69], { label: "F A C", midis: [65, 69, 72] }, { wrongHint: "先给三个选项标上它在 C 大调里的级数，再按功能分类。", encourage: "对，C E G 就是主和弦，T 功能。", blind: true }),
    ear("fn-four", "IV 属于哪个功能？", "S（下属）", "T（主）", "第四级 IV 建在下属音上，所以是下属功能，它想往上把主音托起来。", [60], [65], { label: "D（属）", midis: [67] }, { wrongHint: "功能名来自它的位置：IV 的根音在主音下方，它想往哪边走？", encourage: "对，IV 建在主音下方，是 S（下属）功能。" }),
    ear("fn-cycle", "哪一条是常见的功能循环？", "T → S → D → T", "S → S → T → T", "起承转合：稳定 → 铺垫 → 悬起 → 落地。", [60, 65, 67, 60], [65, 65, 60, 60], { label: "D → D → S → T", midis: [67, 67, 65, 60] }, { wrongHint: "四个位置分别听一遍：先找听着最稳的，再看铺垫和悬起在哪。", encourage: "对，T → S → D → T 就是起承转合。", blind: true }),
    ear("fn-flat", "一直用下属功能（ii、IV 轮着来）会怎样？", "听着平，推不动", "听着很紧张", "全是下属功能，既没悬起也没落地，句子就没有推进。", [65], [67], { label: "自动回到主功能", midis: [60] }, { wrongHint: "先问这段里有没有真正落地过，只有铺垫没有落点时听感会缺什么？", encourage: "对，全是下属功能，没有悬起也没有落地，所以推不动。" }),
    ear("fn-want", "V 级想解决到 I，这个「想」说明 V 是什么功能？", "D（属）", "T（主）", "属功能就是「想回家但还没到家」的状态。", [67], [60], { label: "S（下属）", midis: [65] }, { wrongHint: "按功能三分来对号：能停稳的是哪一种，悬着等解决的是哪一种？", encourage: "对，V 想落地却还没落地，这就是 D（属）功能。" }),
  ],
  handPrompt: "哪一段的功能循环是对的？",
  handChoices: [
    choice("I → IV → V → I（T-S-D-T）", [], [
      chord(0, [60, 64, 67], "C (I)"),
      chord(1, [65, 69, 72], "F (IV)"),
      chord(2, [67, 71, 74], "G (V)"),
      chord(3, [60, 64, 67], "C (I)"),
    ]),
    choice("IV → I → V → vi（S-T-D-T）", [], [
      chord(0, [65, 69, 72], "F (IV)"),
      chord(1, [60, 64, 67], "C (I)"),
      chord(2, [67, 71, 74], "G (V)"),
      chord(3, [69, 72, 76], "Am (vi)"),
    ]),
    choice("ii → vi → I → IV（S-T-T-S）", [], [
      chord(0, [62, 65, 69], "Dm (ii)"),
      chord(1, [69, 72, 76], "Am (vi)"),
      chord(2, [60, 64, 67], "C (I)"),
      chord(3, [65, 69, 72], "F (IV)"),
    ]),
    choice("V → V → I → I（D-D-T-T）", [], [
      chord(0, [67, 71, 74], "G (V)"),
      chord(1, [67, 71, 74], "G (V)"),
      chord(2, [60, 64, 67], "C (I)"),
      chord(3, [60, 64, 67], "C (I)"),
    ]),
  ],
  handCorrect: 0,
  functions: [
    { code: "T", label: "主功能", role: "稳定，停得住", symbol: "I · vi", midis: [60, 64, 67] },
    { code: "S", label: "下属功能", role: "铺垫，想往上", symbol: "ii · IV", midis: [65, 69, 72] },
    { code: "D", label: "属功能", role: "悬着，要解决", symbol: "V · vii°", midis: [67, 71, 74] },
  ],
  diagrams: [
    {
      kind: "harmony-function",
      caption:
        "同样的和弦，作用可能完全不同——区别不在音色，在它想往哪走。T → S → D → T 就是起承转合：稳定、铺垫、悬起、落地。两个常见错误是连着两个 S（听着没推进）和连着两个 D（一直悬着）。点一块能听它的代表和弦。",
    },
  ],
});
