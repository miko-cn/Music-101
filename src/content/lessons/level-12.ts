// 第 12 关 · 侧链泵动
import { PPQ } from "../../core/midi/types.ts";
import { defineLesson, notesAt, kicks, track, choice, ear, BAR } from "../helpers.ts";
import type { StageLessonEntry } from "../types.ts";

export const lesson: StageLessonEntry = defineLesson({
  id: 12,
  title: "侧链泵动",
  stage: "arrangement",
  ability: "arrangement",
  anchor: {
    id: "follow-the-kick",
    name: "跟 kick 走",
    hook: "kick 一响就按下去，kick 一走就抬回来。",
    steps: [
      "侧链是 Gain 自动化，不是假装在抽的效果器。",
      "触发源永远是 kick。",
      "被压低的是持续音（808 / supersaw），让路给 kick。",
      "kick 结束后音量必须抬回来，否则听不到和弦。",
    ],
    takeaway: [
      "侧链是真 Gain 自动化。",
      "触发源永远是 kick，不是别的。",
      "让路的是持续音，不是 kick 自己。",
      "压完要抬回来；MIDI 文件里不含泵动曲线，进 Cubase 再做。",
    ],
  },
  marker: "Level12",
  totalBars: 2,
  audition: "sidechain",
  prereq: [11],
  concept: [
    "侧链是 kick 一响，就把 808 或 supersaw 的音量按下去，kick 走了再抬回来。网页里这是真的 Gain 自动化，不是一个假装在抽的效果器。",
    "泵动跟在 kick 上。如果 808 一直满音量，kick 会被低频盖住——鼓点听不清，整首歌就只剩一团低频在动。",
    "为什么侧链是这类音乐的灵魂：它让「鼓」和「贝斯」轮流当主角。鼓出现的瞬间贝斯让开，鼓一走贝斯又回来，于是产生一种呼吸式的推拉。这是静态的音色堆叠做不出来的。",
    "衰减深度也要看：压得太狠会像断音，压得太浅又听不出泵动。常用做法是压掉 6–10 dB，只压持续音，不压鼓本身。",
    "注意：MIDI 文件里没有侧链曲线。它带的是音高和节奏，泵动属于混音，得在 Cubase 里用侧链压缩器补上。这一关网页里能试听，是因为网页自带音频引擎。",
  ],
  ear: [
    ear("when", "音量该在什么时候被按下去？", "每个 kick 打下去的时候", "只在歌曲结尾", "侧链跟着 kick 走，不是只在结尾抽一下。", [36], [36], { label: "每一拍都按", midis: [36] }),
    ear("who-ducked", "被按下去的通常是谁？", "808 或 supersaw", "kick 自己", "kick 要露出来，所以是别的长音让路。", [36], [36], { label: "军鼓", midis: [38] }),
    ear("back", "kick 离开之后音量怎样？", "再抬回来", "一直保持很小", "抬回来才听得见和弦，也才有一抽一抽的感觉。", [36, 36], [36], { label: "保持满音量", midis: [36] }),
    ear("not-midi", "导出的 MIDI 里有没有侧链曲线？", "没有，得到 Cubase 里再做", "有，拖进去就自动泵", "MIDI 带的是音高和节奏。泵动是混音，不在这个文件里。", [36], [36], { label: "有，但只在最后", midis: [36] }),
    ear("grid-kick", "四四拍的 kick 一小节抽几次？", "四次", "一次", "每拍一个 kick，就抽四次。", [36, 36, 36, 36], [36], { label: "两次", midis: [36, 36] }),
    ear("duck-what", "侧链压下去的是哪一类音？", "持续的长音", "所有音", "kick 自己也压就没法听了。被压的是 808、supersaw 这类一直响的音。", [36], [36], { label: "只有底鼓", midis: [36] }),
  ],
  handPrompt: "泵动应该跟谁走？",
  handChoices: [
    choice("跟每个 kick", [], [], [
      track("KICK", 9, kicks(2)),
      track("808", 0, notesAt([0, 1], 36, 96, BAR - 20)),
    ]),
    choice("808 一直满着，kick 不抽它", [], [], [track("808", 0, notesAt([0, 1], 36, 120, BAR - 20))]),
    choice("只在最后一拍抽一下", [], [], [
      track("KICK", 9, [{ tick: BAR + 3 * PPQ, dur: 100, pitch: 36, vel: 114 }]),
      track("808", 0, notesAt([0, 1], 36, 96, BAR - 20)),
    ]),
  ],
  handCorrect: 0,
});
