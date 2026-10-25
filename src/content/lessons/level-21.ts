// 第 21 关 · 效果
import { defineLesson, notesAt, kicks, track, choice, ear, BAR } from "../helpers.ts";
import type { StageLessonEntry } from "../types.ts";

export const lesson: StageLessonEntry = defineLesson({
  id: 21,
  title: "效果",
  stage: "style",
  ability: "arrangement",
  anchor: {
    id: "fx-at-turns",
    name: "效果用在转折处",
    hook: "效果负责接段落，不是从头糊到尾。",
    steps: [
      "先分清：哪些是乐器，哪些是效果。",
      "MIDI 里的 FX 轨只标记「这里该有个效果」，不带插件。",
      "扫频 / 上升适合放在进副歌前的那一小节。",
      "全程失真会把 kick 和贝斯的分工一起抹掉。",
    ],
    takeaway: [
      "效果 = 转折处的胶水。",
      "FX 轨只标位置，插件要自己在宿主里加。",
      "扫频放副歌前那一小节。",
      "全程效果 = 所有角色糊成一团。",
    ],
  },
  marker: "Level21",
  totalBars: 4,
  prereq: [12],
  concept: [
    "失真、滤波、混响、延迟、glitch 都是效果。它们负责把段落接起来，不是从头到尾糊住。",
    "滤波扫频适合放在进副歌前的那一小节。全程失真会把 kick 和贝斯的分工一起抹掉。",
    "效果的正确位置是「转折处」：段落切换的那一小节、某个和弦变化的地方、或者作为一整段质感铺底。其余时间留干净。",
    "混响和延迟是空间类效果，用在「让这一段听起来更远/更空」；失真、滤波、bitcrush（把声音砍成很少的位，听着像老游戏机）是音色类效果，用在「改变这个声音本身」。混响和滤波一起长时间开着最容易糊。",
    "MIDI 文件里 FX 轨只标记「这里该有个效果」，插件要在 Cubase 里自己加。这不是限制，是分界：网站教的是「什么时候该用什么效果」，DAW 负责「这个效果具体长什么样」。",
  ],
  ear: [
    ear("where-fx", "扫频更适合放在哪？", "进副歌前的过渡", "每一个踢上", "过渡需要把能量推上去，扫频干的就是这个。", [72], [36], { label: "从头到尾", midis: [72] }),
    ear("not-always", "全程失真的问题是？", "角色都糊在一起", "这样最清楚", "效果用在该用的地方，不是默认打开。", [72], [72], { label: "音量变大", midis: [72] }),
    ear("kinds", "下面哪个是效果而不是一件乐器？", "滤波扫频", "kick", "kick 是节奏层，扫频是效果。", [72], [36], { label: "军鼓", midis: [38] }),
    ear("midi", "MIDI 里的 FX 轨表示什么？", "这里有一段效果该出现", "Cubase 会自动加载混响", "文件只告诉你位置和音高，插件要自己加。", [72], [72], { label: "这里要加一件乐器", midis: [72] }),
    ear("glitch", "glitch 更像？", "把过渡切碎", "把贝斯拉成无限长", "它是节奏型的破碎，不是一条长低音。", [72], [36], { label: "加一层混响", midis: [36] }),
    ear("reverb-where", "混响最适合放在哪类位置？", "段落之间", "kick 上", "混响是空间效果，铺在每个音符上只会糊成一片。", [72], [36], { label: "每个八分音符上", midis: [36] }),
  ],
  handPrompt: "选出效果只用在过渡上的编配。",
  handChoices: [
    choice("只在第 4 小节放 FX", [], [], [
      track("KICK", 9, kicks(4)),
      track("FX", 4, notesAt([3], 72, 70, BAR - 20)),
    ]),
    choice("每一小节都铺满 FX", [], [], [
      track("FX", 4, notesAt([0, 1, 2, 3], 72, 100, BAR - 20)),
    ]),
  ],
  handCorrect: 0,
});
