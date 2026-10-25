// 第 14 关 · 和声张力与解决
import { defineLesson, chord, choice, ear } from "../helpers.ts";
import type { StageLessonEntry } from "../types.ts";

export const lesson: StageLessonEntry = defineLesson({
  id: 14,
  title: "和声张力与解决",
  stage: "arrangement",
  ability: "harmony",
  anchor: {
    id: "v-falls-to-i",
    name: "V 要落到 I",
    hook: "属和弦想回家，落到主和弦张力才落地。",
    steps: [
      "找出 V 级和弦（音阶第 5 级，C 大调里是 G）。",
      "V 后面接 I = 解决，张力落地。",
      "V 后面还是 V = 悬在半空，句子没完。",
      "解决不是把和弦弹响一点，是换回主和弦。",
    ],
    takeaway: [
      "V = 音阶第 5 级（C 大调是 G 大三和弦）。",
      "V → I 是解决；停在 V 上句子没结束。",
      "张力来自和弦走向，不是来自调外音。",
    ],
  },
  marker: "Level14",
  totalBars: 2,
  prereq: [13, 7],
  concept: [
    "V 级想解决到 I。在 C 大调里，G 大三和弦后面接 C 大三和弦，张力放掉。",
    "如果 V 后面还是 V，句子会停在半空。解决不是把和弦弹响一点，是让它回到主和弦。",
    "和声张力有两个来源：级数方向（V→I 这种「回家」的方向感）和和弦本身的紧张度（属七的七音想往下掉）。前者决定句子往哪走，后者决定那一刻有多紧。",
    "为什么 V→I 听起来「落地」：V 的三音是导音，它本身就想往上跑到 I 的主音。这个倾向被解决动作满足时，耳朵会有一种「对了」的释放感。",
    "一个常见误解：张力不等于调外音。G 和 C 都在 C 大调里，一样能制造张力。调外音是另一回事，那是色彩，不是张力。",
    "编曲里的用法：段落末尾的最后一个和弦，用 V→I 收；副歌的第一小节往往从 V 开始（就像 I–V–vi–IV 那样），这样进副歌的第一个和弦就已经「要往家走」。",
  ],
  ear: [
    ear("v-chord", "C 大调的 V 是哪个？", "G B D", "F A C", "第 5 级是 G。", [67, 71, 74], [65, 69, 72], { label: "D F A", midis: [62, 65, 69] }),
    ear("resolve-to", "V 最常解决到哪里？", "I", "vi", "属和弦回到主和弦。", [67], [69], { label: "IV", midis: [65] }),
    ear("which-pair", "哪一对是解决？", "G → C", "G → G", "第二个和弦换成了主和弦，张力才落地。", [67, 60], [67, 67], { label: "G → Am", midis: [67, 69] }),
    ear("tense", "一直停在 V 上，听感是？", "悬着", "已经结束", "没有回到 I，句子还没完。", [67], [67], { label: "更紧张", midis: [67] }),
    ear("in-key", "G 和 C 都在 C 大调里吗？", "在", "不在", "两个都是调内和弦，差别是张力，不是调外。", [67], [67], { label: "只有 G 在", midis: [67] }),
    ear("typical-end", "哪条是 C 大调里最典型的终止？", "V → I", "I → V", "属到主是方向最正的终止。I → V 是悬着的，vi → IV 也不是终止。", [67, 60], [60, 67], { label: "vi → IV", midis: [69, 65] }),
  ],
  handPrompt: "选出有解决的两小节。",
  handChoices: [
    choice("G → C", [], [chord(0, [67, 71, 74], "G (V)"), chord(1, [60, 64, 67], "C (I)")]),
    choice("G → G", [], [chord(0, [67, 71, 74], "G (V)"), chord(1, [67, 71, 74], "G (V)")]),
    choice("F♯ → C♯", [], [chord(0, [66, 70, 73], "F#"), chord(1, [61, 65, 68], "C#")]),
  ],
  handCorrect: 0,
});
