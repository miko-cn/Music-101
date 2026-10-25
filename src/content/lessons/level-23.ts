// 第 23 关 · Kawaii bass 的声音特征
import { PPQ } from "../../core/midi/types.ts";
import { defineLesson, notesAt, chord, track, choice, ear, BAR } from "../helpers.ts";
import type { StageLessonEntry } from "../types.ts";

export const lesson: StageLessonEntry = defineLesson({
  id: 23,
  title: "Kawaii bass 的声音特征",
  stage: "style",
  ability: "arrangement",
  anchor: {
    id: "bright-light-grain",
    name: "亮、轻、颗粒",
    hook: "和弦用大七或加九，拍手靠前，和弦抬到高八度。",
    steps: [
      "和弦色彩选大七（maj7）或加九（add9）。",
      "拍手要比厚重的军鼓更靠前。",
      "和弦音区抬到高八度，才够亮。",
      "贝斯保留，但不能独占低频。",
    ],
    takeaway: [
      "色彩 = maj7 / add9。",
      "拍手靠前 = 轻、跳。",
      "和弦抬高八度才亮。",
      "减七太沉，不贴这个风格。",
    ],
  },
  marker: "Level23",
  totalBars: 4,
  prereq: [22, 6],
  concept: [
    "Kawaii bass 比 future bass 更亮、更轻。和弦常用大七或加九，拍手比厚重的军鼓更靠前。",
    "又暗又低、只有 808 的写法更像 future bass 那边。这边要把和弦抬到高八度，并留下拍手的颗粒。",
    "「亮」在技术上落在两处：和弦音区抬高八度，和弦色彩换成 maj7 / add9。低音再低也不影响亮不亮——亮由中高频决定。",
    "「轻」来自鼓的配比：军鼓的瞬态很硬，会把歌压重。把拍手往前摆、军鼓收掉或垫软，节奏就跳起来而不沉。",
    "这两个特征是可以拆开用的：想要亮但不要轻 → 留军鼓、换加九和弦；想要轻但不要亮 → 用拍手加高八度但和弦保持普通大三。",
  ],
  ear: [
    ear("chord-color", "哪种和弦更贴这风格？", "C E G D（加九）", "C E♭ G♭", "加九是亮的。减和弦太暗。", [60, 64, 67, 74], [60, 63, 66], { label: "C E♭ G B♭", midis: [60, 63, 67, 70] }),
    ear("clap", "节奏上更常突出谁？", "拍手", "只留一个很闷的踢", "拍手让它变轻、变跳。", [39], [36], { label: "808", midis: [36] }),
    ear("register", "和弦音区？", "偏高", "和 808 同一个八度", "高八度才明亮。", [84], [36], { label: "很低", midis: [48] }),
    ear("not", "下面哪个不像？", "全程小调减七", "大七、加九、拍手", "减七的色彩太沉。", [60, 63, 66, 69], [60, 64, 67, 74], { label: "高八度和弦", midis: [84] }),
    ear("bass", "贝斯还要不要？", "要，但别盖住高音和弦", "不要低音", "低音还在，只是不独占。", [48], [48], { label: "要并且独占低频", midis: [28] }),
    ear("vs-future", "这个风格相对 future bass 更？", "亮、轻", "暗、重", "亮和轻是这个风格的两根支柱，其余元素可以不变。", [84], [48], { label: "圆、厚", midis: [28] }),
  ],
  handPrompt: "选出更像 kawaii bass 的四小节。",
  handChoices: [
    choice("加九和弦 + 拍手 + 高音锯齿", [], [chord(0, [60, 64, 67, 74], "Cadd9"), chord(1, [67, 71, 74, 81], "Gadd9"), chord(2, [69, 72, 76, 83], "Am(add9)"), chord(3, [65, 69, 72, 79], "Fadd9")], [
      track("CLAP", 9, [0, 1, 2, 3].flatMap((bar) => [1, 3].map((beat) => ({ tick: bar * BAR + beat * PPQ, dur: 80, pitch: 39, vel: 100 })))),
      track("SUPERSAW", 2, notesAt([0, 1, 2, 3], 84, 70)),
      track("BASS", 0, notesAt([0, 1, 2, 3], 48, 80, BAR - 20)),
    ]),
    choice("只有很低的 808", [], [], [track("808", 0, notesAt([0, 1, 2, 3], 28, 120, BAR - 20))]),
  ],
  handCorrect: 0,
});
