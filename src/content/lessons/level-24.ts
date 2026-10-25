// 第 24 关 · Vocal chop 入门
import { PPQ } from "../../core/midi/types.ts";
import { defineLesson, notesAt, track, choice, ear, BAR } from "../helpers.ts";
import type { StageLessonEntry } from "../types.ts";

export const lesson: StageLessonEntry = defineLesson({
  id: 24,
  title: "Vocal chop 入门",
  stage: "style",
  ability: "rhythm",
  anchor: {
    id: "fragments-on-offbeats",
    name: "碎片卡空拍",
    hook: "短音切片，落在正拍之间的空位。",
    steps: [
      "chop = 切碎的短音，不是长音铺底。",
      "正拍留给 kick。",
      "碎片落在 16 分格的偶数位（第 2、4、6…格）。",
      "导出时轨名叫 CHOP，进宿主再自己换音色。",
    ],
    takeaway: [
      "chop 要短。",
      "空拍 = 每拍的后半格（2、4、6…）。",
      "chop 是旋律碎片，不接管低频。",
      "轨名 CHOP 是角色标记，不是音色。",
    ],
  },
  marker: "Level24",
  totalBars: 1,
  prereq: [22],
  concept: [
    "Chop 是把一个短音切成几片，卡在十六分音符的空拍上，而不是唱一整句长音。",
    "先别管歌词。节奏上，第 2、4、6… 这些离拍的格子比正拍更像切片。",
    "为什么 chop 要用和弦音：切片是从人声里切出来的，但重新摆进编曲后，它的音高必须落在当前和弦里，否则会变成一个刺耳的调外音。做法是先用和弦音做 chop，之后再用人声音色替换。",
    "chop 和主旋律的区别：主旋律是「有句子」的，chop 是「没句子」的碎片。所以 chop 不要连成一条能听出旋律的线，否则它会抢主旋律的位置。",
    "MIDI 里的 CHOP 轨只告诉你「这些格子有切片」，音色要在 Cubase 里挂 vocal 采样再切。没有采样就先用锯齿代替，节奏位置是一样的。",
  ],
  ear: [
    ear("short", "chop 的时值？", "短", "拉满一整小节", "切片要能分开，长音就变成铺底了。", [76], [76], { label: "和贝斯一样长", midis: [36] }),
    ear("offbeat", "更像 chop 的位置？", "反拍和十六分的空位", "只在每小节第一下", "正拍通常留给 kick。", [76], [76], { label: "和 kick 同时", midis: [36] }),
    ear("role", "它在编曲里更接近？", "节奏性的旋律碎片", "低频根音", "chop 不负责 808 的工作。", [76], [36], { label: "鼓组", midis: [38] }),
    ear("count", "一拍切成四格的话，空拍可以落在？", "第 2 和第 4 格", "只能落在第 1 格", "16 格里，每拍的后半留给碎片。", [76], [76], { label: "只能落在第 3 格", midis: [76] }),
    ear("export", "导出时这条轨叫？", "CHOP", "KICK", "角色写在轨名里，进宿主再换音色。", [76], [36], { label: "808", midis: [36] }),
    ear("pitch-from", "chop 的音高通常取自？", "当前和弦的音", "随便一个音", "切片要落在和弦里，否则就是调外音。", [76], [61], { label: "kick 的音高", midis: [36] }),
  ],
  handPrompt: "选出像切片的节奏。",
  handChoices: [
    choice(
      "落在 2、4、6、8、10、12、14、16 格",
      [],
      [],
      [track("CHOP", 3, [1, 3, 5, 7, 9, 11, 13, 15].map((step) => ({ tick: step * (PPQ / 4), dur: 80, pitch: 76, vel: 90 })))],
    ),
    choice("一整小节一个长音", [], [], [track("CHOP", 3, notesAt([0], 76, 80, BAR - 20))]),
  ],
  handCorrect: 0,
});
