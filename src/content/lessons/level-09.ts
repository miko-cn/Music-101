// 第 9 关 · 织体：什么是层
import { defineLesson, notesAt, kicks, track, choice, ear } from "../helpers.ts";
import type { StageLessonEntry } from "../types.ts";

export const lesson: StageLessonEntry = defineLesson({
  id: 9,
  title: "织体：什么是层",
  stage: "arrangement",
  ability: "arrangement",
  anchor: {
    id: "track-counts-layer",
    name: "轨道即层数",
    hook: "层按轨道数算，不按音符个数算。",
    steps: [
      "数一层 = 数同一时刻在响的轨道条数。",
      "同一条轨里叠三个音，仍然只是一层。",
      "FX 和 CHOP 是装饰轨，不计入层数。",
      "抬层 = 副歌比主歌多一条真实轨道。",
    ],
    takeaway: [
      "层 = 同时在响的轨道数。",
      "同轨多音仍算一层；装饰轨（FX / CHOP）不算层。",
      "抬层是加轨，不是调音量。",
    ],
  },
  marker: "Level9",
  totalBars: 4,
  prereq: [7],
  concept: [
    "一层就是一条同时在响的轨道。同一条轨里再叠几个音，仍然只算一层——这是这一关最容易被误解的地方。",
    "副歌如果还是主歌那一条贝斯，听起来就不会抬起来。多加 kick 和 supersaw，才是在加层。",
    "FX（扫频、riser 那种由低到高扫上去的音效）和 CHOP（人声切片）是装饰轨，它们标记「这里该有个东西」，但不算进层数。否则一段过渡音效就能把副歌的能量曲线顶上去，那是假的抬层。",
    "为什么层数比音量重要：音量只是把整首歌一起推响，层数是往里加东西。前者听起来像「更吵的同一首歌」，后者才像「新的一段」。",
    "编曲里的做法：编副歌前先列出主歌有哪几轨，副歌逐条对照加——通常加一条中频的 supersaw 加一条高频的 chop，层数就够抬了。",
  ],
  ear: [
    ear("layers-count", "哪个编制层更多？", "贝斯 + kick + supersaw", "只有贝斯", "三条轨是三层，一条贝斯只是一层。", [36, 48, 72], [48], { label: "贝斯 + kick", midis: [36, 48] }, { wrongHint: "别看音色的名字，先数两边各有几条轨道，比比谁更多。", encourage: "对，层数按轨道条数算，三条轨就是三层。" }),
    ear("same-track", "同一个和弦里的三个音算几层？", "一层", "三层", "层按轨道数，不按音符个数。", [60], [60, 64, 67], { label: "两层", midis: [60, 64] }, { wrongHint: "别被音的个数带走，先看这些音是写在同一条轨上还是分在几条轨。", encourage: "对，同一条轨道里不管几个音，都只算一层。" }),
    ear("chorus-need", "副歌通常要比主歌怎样？", "多至少一层", "少一层", "抬层的意思就是副歌的轨道更多。", [60], [60], { label: "一样多", midis: [60] }, { wrongHint: "把主歌和副歌的轨道条数摆在一起比，看副歌是加轨还是减轨。", encourage: "对，副歌要比主歌多至少一层，才算抬起来。" }),
    ear("fx-not-layer", "哪条轨不算进层数？", "FX", "BASS", "扫频和音效是装饰，FX、CHOP 不计入层。", [72], [48], { label: "KICK", midis: [36] }, { wrongHint: "先分清哪些轨是编制的成员、哪些只是装饰性的音效。", encourage: "对，FX 是装饰，层数只数真正参与编制的轨。" }),
    ear("empty", "这一小节没有任何音，层数是？", "0", "1", "没有轨道在响，层数就是 0。", [60], [60], { label: "2", midis: [60, 64] }, { wrongHint: "层数来自正在响的轨道条数，先确认这一小节里有没有轨在响。", encourage: "对，一个音都没响的时候，层数就是 0。" }),
    ear("same-octave", "贝斯和 supersaw 都在 MIDI 60 附近响，层数算几层？", "2 层", "1 层", "层数不看音高，只看轨道条数。两条轨就是两层，虽然它们在中频会打架——那是频段问题，不是层数问题。", [60, 60], [60], { label: "3 层", midis: [60, 60, 60] }, { wrongHint: "别被音高骗了，先数有几条轨在响，音高重合不改变轨道条数。", encourage: "对，两条轨就是两层，音高撞车是频段问题。" }),
  ],
  handPrompt: "选出三层织体。",
  handChoices: [
    choice("贝斯 + kick + supersaw", [], [], [
      track("BASS", 0, notesAt([0, 1, 2, 3], 48)),
      track("KICK", 9, kicks(4)),
      track("SUPERSAW", 2, notesAt([0, 1, 2, 3], 72, 80)),
    ]),
    choice("只有贝斯", [], [], [track("BASS", 0, notesAt([0, 1, 2, 3], 48))]),
    choice("只有 FX", [], [], [track("FX", 4, notesAt([0], 60, 40, 400))]),
  ],
  handCorrect: 0,
  layerStack: [
    {
      title: "主歌",
      layers: [{ name: "贝斯", note: "一条轨 = 一层" }],
    },
    {
      title: "副歌",
      layers: [
        { name: "贝斯", note: "沿用主歌" },
        { name: "kick", added: true, note: "加一条真实轨道" },
        { name: "supersaw", added: true, note: "加一条真实轨道" },
        { name: "FX 扫频", decorative: true, note: "装饰轨，不计入层数" },
      ],
    },
  ],
  diagrams: [
    {
      kind: "layer-stack",
      caption:
        "层 = 同时在响的轨道数，同一条轨里叠三个音仍然只是一层。虚线框的 FX 是装饰轨，不计入层数——否则一段过渡音效就能把副歌的能量曲线顶上去，那是假的抬层。",
    },
  ],
});
