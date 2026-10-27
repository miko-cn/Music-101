// 第 22 关 · Future bass 骨架
import { PPQ } from "../../core/midi/types.ts";
import { defineLesson, notesAt, kicks, loopChords, track, choice, ear, BAR } from "../helpers.ts";
import type { StageLessonEntry } from "../types.ts";

export const lesson: StageLessonEntry = defineLesson({
  id: 22,
  title: "Future bass 骨架",
  stage: "style",
  ability: "arrangement",
  anchor: {
    id: "chorus-needs-saw",
    name: "副歌加锯齿",
    hook: "主歌留 kick + 贝斯，副歌铺 supersaw，短 chop 卡反拍。",
    steps: [
      "主歌：kick + 贝斯，只两层。",
      "副歌：加上一条 supersaw 和弦层。",
      "chop 要短，卡在反拍上。",
      "kick 贯穿始终，把拍子钉住。",
    ],
    takeaway: [
      "骨架 = 主歌两层，副歌多两层。",
      "副歌最显耳的元素是 supersaw 和弦。",
      "chop 短、卡反拍。",
      "拿掉锯齿层，副歌就空了。",
    ],
  },
  marker: "Level22",
  totalBars: 8,
  prereq: [13, 10, 6],
  sections: [
    { name: "Verse", startBar: 0, bars: 4 },
    { name: "Chorus", startBar: 4, bars: 4 },
  ],
  layerStack: [
    {
      title: "主歌",
      layers: [
        { name: "kick", note: "钉住拍子" },
        { name: "贝斯", note: "接住根音" },
      ],
    },
    {
      title: "副歌",
      layers: [
        { name: "kick", note: "钉住拍子" },
        { name: "贝斯", note: "接住根音" },
        { name: "supersaw 和弦", note: "铺开，和声变厚", added: true },
        { name: "vocal chop", note: "短，卡在反拍", added: true },
      ],
    },
  ],
  concept: [
    "Future bass 的骨架是：主歌留 kick 和贝斯，副歌把 supersaw 和弦铺开，再用短的 chop 卡在反拍上。",
    "没有副歌那一层锯齿，它就还是一条空的主歌。",
    "为什么副歌必须换成整片铺开的多声部和弦（chord texture）而不是加一层贝斯：future bass 的副歌靠的是「和声变厚」，不是「低音变多」。同一段和声用 supersaw 铺开，声音立刻从独白变成合唱。",
    "chop 的作用是给副歌加「小细节」，让密集的锯齿不至于呆板。它必须短、必须卡在反拍，不然就变成另一条旋律线，和主旋律抢位置。",
    "写这类歌的顺序：先定 8 小节的和声循环 → 主歌两层 → 副歌加 supersaw → 最后撒 chop。顺序反了容易先做出一个很满、但没有骨架的副歌。",
  ],
  ear: [
    ear("drop", "Future bass 的副歌最显耳的是？", "supersaw 和弦", "只有帽子", "副歌靠铺开的锯齿和弦。", [72, 76, 79], [42], { label: "808", midis: [36] }, { wrongHint: "把副歌的层逐个听过去，先排除单件打击乐和低频层，再看剩下哪条。", encourage: "对，副歌最显耳的是铺开的 supersaw 和弦。" }),
    ear("chop-place", "chop 更适合？", "短，卡在反拍", "从头拉到尾", "切片要短，才像人声碎片。", [76], [76], { label: "和 kick 一样长", midis: [36] }, { wrongHint: "先听 chop 的长度，再看它落在拍子的哪一边。", encourage: "对，chop 要短，卡在反拍上才有碎片感。" }),
    ear("verse", "主歌相对副歌？", "层更少", "层更多", "主歌把空间留给副歌。", [36, 48], [36, 48, 72], { label: "一样多", midis: [36, 48] }, { wrongHint: "把主歌和副歌各自的层都数一遍，比一比再作答。", encourage: "对，主歌层更少，把空间留给副歌。" }),
    ear("kick", "踢在这种骨架里？", "主歌副歌都在", "只在前奏出现一次", "踢把拍子钉住。", [36, 36], [36], { label: "只在副歌", midis: [36] }, { wrongHint: "按结构分区段听一遍：每一段里有没有这只底鼓。", encourage: "对，kick 贯穿主歌和副歌，把拍子钉住。" }),
    ear("not-style", "下面哪个不像这个骨架？", "副歌把 supersaw 拿掉", "副歌加上锯齿和弦", "拿掉锯齿，副歌就空了。", [36, 48], [36, 48, 72], { label: "主歌保留两层", midis: [36, 48] }, { wrongHint: "把这一关的骨架先写下来，再拿每个选项去对照，看哪条跟骨架反着来。", encourage: "对，副歌拿掉 supersaw，就还是一条空的主歌。" }),
    ear("808-job", "这个骨架里 808 的任务是？", "接住根音和低频", "加高频", "808 管低频根音，高频是 supersaw 和 chop 的活。", [36], [72], { label: "打鼓点", midis: [72] }, { wrongHint: "先想每件乐器在骨架里各干什么活，再看 808 落在频段的哪一头。", encourage: "对，808 负责接住根音和低频这一段。" }),
  ],
  handPrompt: "选出 Future bass 的副歌骨架。",
  handChoices: [
    choice("副歌有 supersaw 和 chop", [], loopChords(8), [
      track("KICK", 9, kicks(8)),
      track("BASS", 0, notesAt([0, 1, 2, 3, 4, 5, 6, 7], 36, 96, BAR - 20)),
      track("SUPERSAW", 2, notesAt([4, 5, 6, 7], 72, 84)),
      track("CHOP", 3, [4, 5, 6, 7].flatMap((bar) => [1, 3].map((beat) => ({
        tick: bar * BAR + beat * PPQ,
        dur: 120,
        pitch: 76,
        vel: 90,
      })))),
    ]),
    choice("副歌仍然只有贝斯", [], [], [
      track("BASS", 0, notesAt([0, 1, 2, 3, 4, 5, 6, 7], 36)),
    ]),
  ],
  handCorrect: 0,
  diagrams: [
    {
      kind: "layer-stack",
      caption:
        "副歌多的不是低音，是和声厚度：主歌两层，副歌加上铺开的 supersaw 和弦和短 chop。把 supersaw 拿掉，副歌就还是一条空的主歌。",
    },
  ],
});
