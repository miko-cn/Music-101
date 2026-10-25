import type { PitchClass } from "../core/theory/pitch.ts";
import type { ScaleId } from "../core/theory/scale.ts";
import type { SkeletonChord, SkeletonNote, TrackRole } from "../core/midi/project.ts";
import { PPQ } from "../core/midi/types.ts";
import type { DrumLaneSpec, StageChoice, StageEar, StageLesson } from "./stage1.ts";
import { anchorOf } from "./anchors.ts";

const BAR = 4 * PPQ;

function notesAt(bars: number[], pitch: number, vel = 90, dur = BAR - 40): SkeletonNote[] {
  return bars.map((bar) => ({ tick: bar * BAR, dur, pitch, vel }));
}

function kicks(bars: number): SkeletonNote[] {
  const notes: SkeletonNote[] = [];
  for (let bar = 0; bar < bars; bar += 1) {
    for (const beat of [0, 1, 2, 3]) {
      notes.push({ tick: bar * BAR + beat * PPQ, dur: 100, pitch: 36, vel: 114 });
    }
  }
  return notes;
}

function chord(bar: number, pitches: number[], text: string): SkeletonChord {
  return { tick: bar * BAR, pitches, text };
}

function loopChords(count: number): SkeletonChord[] {
  const shapes = [
    { pitches: [60, 64, 67], text: "C (I)" },
    { pitches: [67, 71, 74], text: "G (V)" },
    { pitches: [69, 72, 76], text: "Am (vi)" },
    { pitches: [65, 69, 72], text: "F (IV)" },
  ];
  return Array.from({ length: count }, (_, bar) => {
    const shape = shapes[bar % 4] ?? shapes[0];
    return { tick: bar * BAR, pitches: shape.pitches, text: shape.text };
  });
}

function lane(role: DrumLaneSpec["role"], label: string, on: number[]): DrumLaneSpec {
  const target = Array.from({ length: 16 }, () => false);
  for (const step of on) target[step] = true;
  return { role, label, target };
}

function track(role: TrackRole, channel: number, notes: SkeletonNote[]) {
  return { role, channel, notes };
}

function choice(
  label: string,
  notes: SkeletonNote[] = [],
  chords: SkeletonChord[] = [],
  tracks?: StageChoice["tracks"],
): StageChoice {
  return { label, notes, chords, tracks };
}

/**
 * 听辨题的位置轮转。
 *
 * 正确答案如果永远排在第一个，学习者会形成「永远选第一」的答题习惯，
 * 听辨能力就练不出来。这里按声明顺序轮换正确项所在位置。
 */
let earSlot = 0;

function ear(
  id: string,
  prompt: string,
  correctLabel: string,
  wrongLabel: string,
  explain: string,
  correctMidis: number[] = [60],
  wrongMidis: number[] = [61],
  extra?: { label: string; midis: number[] },
): StageEar {
  const items = [
    { label: correctLabel, midis: correctMidis },
    { label: wrongLabel, midis: wrongMidis },
  ];
  if (extra) items.push({ label: extra.label, midis: extra.midis });
  const correct = items[0];
  const rest = items.slice(1);
  const correctIndex = earSlot++ % 3;
  const choices = [...rest];
  choices.splice(correctIndex, 0, correct);
  return { id, prompt, choices, correct: correctIndex, explain };
}

function lesson(
  partial: Pick<StageLesson, "id" | "title" | "concept" | "ear" | "handPrompt" | "handChoices" | "handCorrect" | "totalBars" | "marker"> &
    Partial<StageLesson>,
): StageLesson {
  return {
    earPass: 5,
    bpm: 140,
    keyRoot: 0 as PitchClass,
    keyScale: "major" as ScaleId,
    ...partial,
    anchor: partial.anchor ?? anchorOf(partial.id),
  };
}

const hats = [0, 2, 4, 6, 8, 10, 12, 14];

export const ARRANGING_LESSONS: readonly StageLesson[] = [
  lesson({
    id: 9,
    title: "织体：什么是层",
    marker: "Level9",
    totalBars: 4,
    prereq: [7],
    concept: [
      "一层就是一条同时在响的轨道。同一条轨里再叠几个音，仍然只算一层——这是这一关最容易被误解的地方。",
      "副歌如果还是主歌那一条贝斯，听起来就不会抬起来。多加 kick 和 supersaw，才是在加层。",
      "FX（扫频、riser）和 CHOP（人声切片）是装饰轨，它们标记「这里该有个东西」，但不算进层数。否则一段过渡音效就能把副歌的能量曲线顶上去，那是假的抬层。",
      "为什么层数比音量重要：音量只是把整首歌一起推响，层数是往里加东西。前者听起来像「更吵的同一首歌」，后者才像「新的一段」。",
      "编曲里的做法：编副歌前先列出主歌有哪几轨，副歌逐条对照加——usually 加一条中频的 supersaw 加一条高频的 chop，层数就够抬了。",
    ],
    ear: [
      ear("layers-count", "哪个编制层更多？", "贝斯 + kick + supersaw", "只有贝斯", "三条轨是三层，一条贝斯只是一层。", [36, 48, 72], [48], { label: "贝斯 + kick", midis: [36, 48] }),
      ear("same-track", "同一个和弦里的三个音算几层？", "一层", "三层", "层按轨道数，不按音符个数。", [60], [60, 64, 67], { label: "两层", midis: [60, 64] }),
      ear("chorus-need", "副歌通常要比主歌怎样？", "多至少一层", "少一层", "抬层的意思就是副歌的轨道更多。", [60], [60], { label: "一样多", midis: [60] }),
      ear("fx-not-layer", "哪条轨不算进层数？", "FX", "BASS", "扫频和音效是装饰，FX、CHOP 不计入层。", [72], [48], { label: "KICK", midis: [36] }),
      ear("empty", "这一小节没有任何音，层数是？", "0", "1", "没有轨道在响，层数就是 0。", [60], [60], { label: "2", midis: [60, 64] }),
      ear("same-octave", "贝斯和 supersaw 都在 MIDI 60 附近响，层数算几层？", "2 层", "1 层", "层数不看音高，只看轨道条数。两条轨就是两层，虽然它们在中频会打架——那是频段问题，不是层数问题。", [60, 60], [60], { label: "3 层", midis: [60, 60, 60] }),
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
  }),
  lesson({
    id: 10,
    title: "鼓组四件套",
    marker: "Level10",
    totalBars: 1,
    prereq: [9],
    concept: [
      "四件套是 kick、snare、clap、hat。一格是一个十六分音符，一拍四格。",
      "最稳的一句：踢在第 1 和第 9 格（第 1、3 拍），军鼓和拍手在第 5 和第 13 格（第 2、4 拍），踩镲把八分音符铺满。",
      "为什么踢在强拍、军鼓在反拍：强拍负责把拍子钉住，反拍负责把拍子往前推。只有强拍的歌会像倒计时，只有反拍的歌会飘。两者一起才有「走路」的感觉。",
      "拍手叠在军鼓同一个位置，是加厚反拍，不是另起一拍。所以拍手是「让反拍变厚」，不是「多一个节奏点」。",
      "改这一关的最快方式：先把鼓型背成一句话——踢 1、9，军鼓拍手 5、13，踩镲全偶数格。编曲时先敲出来，再去调细节。",
    ],
    ear: [
      ear("kick-place", "踢通常落在哪两拍？", "第 1 拍和第 3 拍", "第 2 拍和第 4 拍", "第 1、3 拍是强拍，留给 kick。", [36, 36], [36], { label: "每一拍", midis: [36, 36, 36, 36] }),
      ear("snare-place", "军鼓通常落在哪两拍？", "第 2 拍和第 4 拍", "每一拍", "反拍上的军鼓让句子往前走。", [38], [38], { label: "第 1 拍和第 3 拍", midis: [38] }),
      ear("hat-rate", "踩镲铺八分音符，一拍有几下？", "两下", "一下", "八分音符是一拍两下，十六分音符才是一拍四下。", [42, 42], [42], { label: "四下", midis: [42, 42, 42, 42] }),
      ear("clap-with", "拍手最常和谁一起？", "军鼓", "踢", "拍手叠在军鼓的反拍上，把反拍变厚。", [39], [36], { label: "踩镲", midis: [42] }),
      ear("grid", "第 5 格是第几拍的第一格？", "第 2 拍", "第 3 拍", "1–4 格是第 1 拍，5–8 格是第 2 拍。", [36], [36], { label: "第 1 拍", midis: [36] }),
      ear("high-role", "四件套里负责高频持续铺底的是？", "踩镲 hat", "踢 kick", "踩镲负责高频铺底，踢负责低频冲击，军鼓负责中频节奏点。", [42], [36], { label: "军鼓 snare", midis: [38] }),
    ],
    handPrompt: "把四件套打成：踢在 1 和 9，军鼓、拍手在 5 和 13，踩镲打所有八分音符。",
    handChoices: [],
    handCorrect: 0,
    drums: [
      lane("KICK", "踢 kick", [0, 8]),
      lane("SNARE", "军鼓 snare", [4, 12]),
      lane("CLAP", "拍手 clap", [4, 12]),
      lane("HAT", "踩镲 hat", hats),
    ],
  }),
  lesson({
    id: 11,
    title: "808 和 kick 的分工",
    marker: "Level11",
    totalBars: 2,
    prereq: [10],
    concept: [
      "kick 要短，占的是一下一下的冲击。808 要长，占的是根音那条持续的低频。",
      "808 如果低到 MIDI 33 以下，又和 kick 落在同一小节，低频会糊成一块。根音放在 36 附近，把更低的位置留给 kick 的瞬态。",
      "为什么这个界限是 33：MIDI 33 大约是 43Hz。低于这个频率，人耳基本听不出音高，只感觉到「轰」，而鼓和贝斯的瞬态都挤在这段最容易被糊掉的低频里。",
      "分工的实际收益：kick 打的是「点」，808 打的是「线」。两个都在低频但时值不同，叠在一起才有「又厚又跳」；两个都用长音，低频就只会互相抵消。",
      "编曲里的检查清单：听一遍低频，如果鼓点糊成一团、听不出每个 kick 的位置，就是 808 太低或者两者太贴。",
    ],
    ear: [
      ear("who-short", "哪个该是短音？", "kick", "808", "kick 负责冲击，时值短。808 负责根音，时值长。", [36], [36], { label: "两个都一样", midis: [36] }),
      ear("who-root", "哪个负责和弦根音？", "808", "hat", "808 跟着和声的根音走，帽子只负责节奏。", [36], [42], { label: "kick", midis: [36] }),
      ear("too-low", "808 低到多少开始容易和 kick 打架？", "MIDI 33 以下", "MIDI 60 以上", "低于 MIDI 33 大约就是 45Hz 以下。", [33], [60], { label: "MIDI 48 以下", midis: [48] }),
      ear("same-bar", "低频冲突还要满足什么？", "同一小节里也有 kick", "只要 808 很低就一定冲突", "低，并且跟 kick 叠在同一小节，才算冲突。", [28, 36], [28], { label: "必须换 BPM", midis: [28] }),
      ear("pitch-36", "根音放在 MIDI 36，算不算已经低到冲突线以下？", "不算", "算", "36 比 33 高，还在可用的根音区。", [36], [28], { label: "刚好在边界", midis: [33] }),
      ear("both-36", "808 和 kick 都用 MIDI 36，会怎样？", "低频会糊", "完全没问题", "音高一样又同时响，低频重心叠在一起，听起来糊成一团。", [36, 36], [36, 36], { label: "完全没问题", midis: [36, 36] }),
    ],
    handPrompt: "选出分工清楚的一对。",
    handChoices: [
      choice("kick 短，808 在 MIDI 36 拉长", [], [], [
        track("KICK", 9, kicks(2)),
        track("808", 0, notesAt([0, 1], 36, 100, BAR - 20)),
      ]),
      choice("808 降到 MIDI 28，还和 kick 叠在一起", [], [], [
        track("KICK", 9, kicks(2)),
        track("808", 0, notesAt([0, 1], 28, 100, BAR - 20)),
      ]),
      choice("两件都打成十六分音符", [], [], [
        track("KICK", 9, kicks(2)),
        track("808", 0, kicks(2).map((note) => ({ ...note, pitch: 36 }))),
      ]),
    ],
    handCorrect: 0,
  }),
  lesson({
    id: 12,
    title: "侧链泵动",
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
      ear("duck-what", "侧链压下去的是哪一类音？", "持续的长音", "所有音", "kick 自己也压就没法听了。被压的是 808、supersaw 这类一直响的音。", [36], [36], { label: "所有音", midis: [36] }),
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
  }),
  lesson({
    id: 13,
    title: "段落与能量曲线",
    marker: "Level13",
    totalBars: 8,
    showEnergy: true,
    prereq: [12],
    sections: [
      { name: "Verse", startBar: 0, bars: 4 },
      { name: "Chorus", startBar: 4, bars: 4 },
    ],
    concept: [
      "主歌和副歌要标出来。能量按「层数 × 音区权重 × 平均力度」算。",
      "副歌抬层要同时满足两件：平均能量至少是主歌的 1.5 倍，而且平均层数至少多 1。",
      "为什么是 1.5 倍而不是「高一点」：耳朵对整体响度的感知是对数的，小幅提升在混音里会被自动响度处理吃掉。1.5 倍是刚好能被听成「换了一段」的下限。",
      "音区权重这一项常被忽略：低频权重高（最低音 < 60 记 1.0），所以「加一条低频」比「加一条高音」对能量的贡献更大。这解释了为什么副歌加 808 常常比加 hat 更有效——但那是另一种思路，本关教的是算得准。",
      "实际用法：编完先看能量曲线是不是有台阶。如果副歌那四小节是平的，说明抬层没做到，或者抬的层太轻。",
    ],
    ear: [
      ear("names", "哪两个段落是拿来比能量的？", "主歌和副歌", "前奏和尾奏", "抬层看的是副歌相对主歌。", [60], [60], { label: "第一小节和最后一小节", midis: [60] }),
      ear("ratio", "副歌能量至少要到主歌的几倍？", "1.5 倍", "一样就行", "只高一点点不算抬起来。", [60], [60], { label: "3 倍", midis: [60] }),
      ear("layers", "除了能量，层数还要怎样？", "至少多 1 层", "可以更少", "两条都要满足。", [60], [60], { label: "必须多 3 层", midis: [60] }),
      ear("weight", "最低音在 MIDI 60 以下，音区权重是？", "1.0", "0.4", "越低的音，能量权重越大。", [48], [72], { label: "0.6", midis: [60] }),
      ear("marker", "段落写进 MIDI 的哪里？", "Marker", "和弦 meta 事件", "首版只写 Marker，不写和弦 meta。", [60], [60], { label: "tempo 事件", midis: [60] }),
      ear("weight-80", "MIDI 80 的音，音区权重是多少？", "0.4", "0.6", "80 已经进入中高位区，权重降到 0.4。", [80], [60], { label: "1.0", midis: [48] }),
    ],
    handPrompt: "选出副歌真的抬起来的编配。",
    handChoices: [
      choice("副歌多一条 supersaw", [], [], [
        track("BASS", 0, notesAt([0, 1, 2, 3, 4, 5, 6, 7], 48, 80)),
        track("SUPERSAW", 2, notesAt([4, 5, 6, 7], 72, 100)),
      ]),
      choice("主歌副歌都只有贝斯", [], [], [track("BASS", 0, notesAt([0, 1, 2, 3, 4, 5, 6, 7], 48, 80))]),
    ],
    handCorrect: 0,
  }),
  lesson({
    id: 14,
    title: "和声张力与解决",
    marker: "Level14",
    totalBars: 2,
    prereq: [13, 7],
    concept: [
      "V 级想解决到 I。在 C 大调里，G 大三后面接 C 大三，张力放掉。",
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
      choice("F# → C#", [], [chord(0, [66, 70, 73], "F#"), chord(1, [61, 65, 68], "C#")]),
    ],
    handCorrect: 0,
  }),
  lesson({
    id: 15,
    title: "音色角色与频段",
    marker: "Level15",
    totalBars: 1,
    prereq: [14],
    concept: [
      "kick 待在最低的地方，贝斯在它上面一点，supersaw 再往上。每条轨有自己的频段。",
      "如果大家都挤在中央 C 附近，中频会糊。频率重心离得太近，诊断就会说它们打架。",
      "为什么中频最危险：中频（约 200–2000Hz）是大多数人声和主旋律所在的区域，这个区间一旦被两三个东西同时占满，听觉就分不出层次，只能听到一团「嗡嗡的中间」。",
      "解决的办法不是把某个音调高，而是分工：kick 只管 60Hz 以下的冲击，808 只管 40–60Hz 的持续根音，贝斯走 80–200Hz，supersaw 走中频以上往上。层数可以多，但同一个频段里别放两个角色。",
      "检查方法：把每条轨单独静音听一遍。如果去掉任何一条你都没感觉，那条轨可能和别人重叠了。",
    ],
    ear: [
      ear("kick-band", "kick 该待在哪？", "最低", "和主旋律同一个八度", "踢是低频的冲击，不跟旋律抢位置。", [36], [60], { label: "最高", midis: [84] }),
      ear("saw-band", "supersaw 更适合哪？", "中高频", "和 kick 同一个音", "锯齿铺的是和弦的中高频。", [72], [36], { label: "最低", midis: [24] }),
      ear("same-note", "两条轨都只弹 MIDI 60，容易怎样？", "挤在中频", "自动分成高低", "音高一样，重心就挨在一起。", [60, 60], [60], { label: "没有影响", midis: [60] }),
      ear("role", "贝斯的角色是？", "接在 kick 上面的根音", "代替踩镲", "贝斯管和声的低音，不管节奏的帽子。", [48], [42], { label: "负责高频", midis: [84] }),
      ear("count", "频段规则会拿掉哪类轨？", "FX 和 CHOP", "BASS", "装饰轨不参加频段比较。", [72], [48], { label: "KICK", midis: [36] }),
      ear("kick-bass-close", "kick 和贝斯都在 MIDI 36 附近，会怎样？", "低频互相盖住", "完全正常", "两个角色挤在同一段低频，鼓点和根音会糊。", [36, 36], [36], { label: "完全正常", midis: [36] }),
    ],
    handPrompt: "选出频段分开的编配。",
    handChoices: [
      choice("kick 低，supersaw 高", [], [], [
        track("KICK", 9, [{ tick: 0, dur: 120, pitch: 36, vel: 110 }]),
        track("SUPERSAW", 2, notesAt([0], 76, 80)),
      ]),
      choice("贝斯和 supersaw 都弹 MIDI 60", [], [], [
        track("BASS", 0, notesAt([0], 60)),
        track("SUPERSAW", 2, notesAt([0], 60)),
      ]),
    ],
    handCorrect: 0,
  }),
  lesson({
    id: 16,
    title: "厚度",
    marker: "Level16",
    totalBars: 2,
    prereq: [15],
    concept: [
      "厚度来自叠八度，不是把所有乐器都塞进同一个音。贝斯在低八度，和弦在高八度，中间才透气。",
      "只在一个八度里堆，歌会窄。低一个八度再高一个八度，同一条和声就有宽度。",
      "为什么八度是最好的厚度单位：八度之内是「和声关系」（比如 C 和 E 是一组和弦音），八度之外是「同音不同位置」。把同一个和弦音往上挪八度，它还是那个和弦音，但听感上多了一层空间。",
      "所以叠八度不等于叠新角色。同一个乐器在两个八度响，仍然是同一类声音，只是音区拉开了——这也是上一关说的「层数不因为叠八度而增加」。",
      "实际做法：先定每件乐器的「站位」（哪件在最下面），再在每件乐器的站位上加一到两个八度。顺序反了就会乱。",
    ],
    ear: [
      ear("octave-stack", "叠八度是什么意思？", "同一个音名，差一个或两个八度一起响", "把所有音都移到 C4", "C3 和 C4 一起，是厚度；全挤在 C4，是窄。", [48, 60], [60], { label: "把所有音都移到 C4", midis: [60] }),
      ear("bass-octave", "贝斯相对和弦通常怎样？", "低一个八度", "高两个八度", "低频留给贝斯。", [48], [84], { label: "一样高", midis: [60] }),
      ear("not-layers", "两个八度的同一件乐器算什么？", "厚度，不是多一种角色", "自动变成鼓", "还是同一类声音，只是音区拉开了。", [48, 60], [48, 60], { label: "算两层", midis: [48, 60] }),
      ear("narrow", "所有旋律都在 MIDI 60 附近，听感是？", "窄", "已经很宽", "没有音区差，就没有厚度。", [60], [60], { label: "没有影响", midis: [60] }),
      ear("chord-high", "supersaw 适合叠在哪？", "比贝斯高的八度", "和 kick 同一个键", "高八度的和弦把中高频铺开。", [72], [36], { label: "比贝斯低", midis: [36] }),
      ear("widen-first", "想让声音变宽，最先该动什么？", "音区", "力度", "力度变大只会更响，音区拉开才会变宽。", [48, 60], [60], { label: "速度", midis: [60] }),
    ],
    handPrompt: "选出有八度厚度的贝斯。",
    handChoices: [
      choice("C2 加 C3", [], [], [
        track("BASS", 0, [...notesAt([0, 1], 36, 100), ...notesAt([0, 1], 48, 90)]),
      ]),
      choice("只有 C4", [], [], [track("BASS", 0, notesAt([0, 1], 60))]),
    ],
    handCorrect: 0,
  }),
  lesson({
    id: 17,
    title: "动态",
    marker: "Level17",
    totalBars: 8,
    prereq: [13],
    sections: [
      { name: "Verse", startBar: 0, bars: 4 },
      { name: "Chorus", startBar: 4, bars: 4 },
    ],
    concept: [
      "力度让歌呼吸。主歌收着点，副歌推上去。全程同一个力度，段落会糊成一条直线。",
      "这里先把主歌力度放在 70，副歌放到 110。层可以先不变，单靠力度也能让曲线动起来。",
      "力度和层数的分工：层数决定「多了什么」，力度决定「多响」。如果一层都没有，力度调满也只是同一首歌变吵；反过来，层加对了但力度一样，动态还是平的。所以两个要一起动。",
      "为什么主歌要「收着」而不是和副歌一样：留余地才能推得上去。全程顶满的副歌听不出副歌，因为没有对比就没有参照。",
      "力度写在每个音符的 velocity 上，导出到 Cubase 后依然保留——所以这是少数几个能直接带进工程继续调的东西。",
    ],
    ear: [
      ear("verse-vel", "主歌力度更适合？", "收一点，大约 70", "从头到尾 127", "主歌留着余地，副歌才推得上去。", [70], [127], { label: "40", midis: [40] }),
      ear("chorus-vel", "副歌力度相对主歌？", "更大", "更小", "副歌是要出来的那一段。", [110], [70], { label: "一样", midis: [90] }),
      ear("flat", "全程力度一样，听感是？", "不呼吸", "自动有段落", "力度不变，动态就是平的。", [90], [90], { label: "更厚", midis: [90] }),
      ear("not-only", "力度是能量公式里的哪一项？", "平均力度", "层数本身", "能量是层、音区、力度乘在一起。", [90], [90], { label: "音区权重", midis: [90] }),
      ear("where", "力度写在 MIDI 的哪里？", "音符的 velocity", "Marker 文本", "每个音自己带力度。", [90], [90], { label: "tempo", midis: [90] }),
      ear("ratio-vel", "力度从 70 提到 110，大约是几倍？", "约 1.6 倍", "正好 2 倍", "110 除以 70 约等于 1.57，也就是约 1.6 倍。", [110], [140], { label: "正好 2 倍", midis: [140] }),
    ],
    handPrompt: "选出主歌轻、副歌重的力度。",
    handChoices: [
      choice("主歌 70，副歌 110", [], [], [
        track("BASS", 0, [...notesAt([0, 1, 2, 3], 48, 70), ...notesAt([4, 5, 6, 7], 48, 110)]),
      ]),
      choice("全程 90", [], [], [track("BASS", 0, notesAt([0, 1, 2, 3, 4, 5, 6, 7], 48, 90))]),
    ],
    handCorrect: 0,
  }),
  lesson({
    id: 18,
    title: "效果",
    marker: "Level18",
    totalBars: 4,
    prereq: [12],
    concept: [
      "失真、滤波、混响、延迟、glitch 都是效果。它们负责把段落接起来，不是从头到尾糊住。",
      "滤波扫频适合放在进副歌前的那一小节。全程失真会把 kick 和贝斯的分工一起抹掉。",
      "效果的正确位置是「转折处」：段落切换的那一小节、某个和弦变化的地方、或者作为一整段质感铺底。其余时间留干净。",
      "混响和延迟是空间类效果，用在「让这一段听起来更远/更空」；失真、滤波、bitcrush 是音色类效果，用在「改变这个声音本身」。混响和滤波一起长时间开着最容易糊。",
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
  }),
  lesson({
    id: 19,
    title: "Future bass 骨架",
    marker: "Level19",
    totalBars: 8,
    prereq: [13, 10, 6],
    sections: [
      { name: "Verse", startBar: 0, bars: 4 },
      { name: "Chorus", startBar: 4, bars: 4 },
    ],
    concept: [
      "Future bass 的骨架是：主歌留 kick 和贝斯，副歌把 supersaw 和弦铺开，再用短的 chop 卡在反拍上。",
      "没有副歌那一层锯齿，它就还是一条空的主歌。",
      "为什么副歌必须换成 chord texture 而不是加一层贝斯：future bass 的副歌靠的是「和声变厚」，不是「低音变多」。同一段和声用 supersaw 铺开，声音立刻从独白变成合唱。",
      "chop 的作用是给副歌加「小细节」，让密集的锯齿不至于呆板。它必须短、必须卡在反拍，不然就变成另一条旋律线，和主旋律抢位置。",
      "写这类歌的顺序：先定 8 小节的和声循环 → 主歌两层 → 副歌加 supersaw → 最后撒 chop。顺序反了容易先做出一个很满、但没有骨架的副歌。",
    ],
    ear: [
      ear("drop", "Future bass 的副歌最显耳的是？", "supersaw 和弦", "只有帽子", "副歌靠铺开的锯齿和弦。", [72, 76, 79], [42], { label: "808", midis: [36] }),
      ear("chop-place", "chop 更适合？", "短，卡在反拍", "从头拉到尾", "切片要短，才像人声碎片。", [76], [76], { label: "和 kick 一样长", midis: [36] }),
      ear("verse", "主歌相对副歌？", "层更少", "层更多", "主歌把空间留给副歌。", [36, 48], [36, 48, 72], { label: "一样多", midis: [36, 48] }),
      ear("kick", "踢在这种骨架里？", "主歌副歌都在", "只在前奏出现一次", "踢把拍子钉住。", [36, 36], [36], { label: "只在副歌", midis: [36] }),
      ear("not-style", "下面哪个不像这个骨架？", "副歌把 supersaw 拿掉", "副歌加上锯齿和弦", "拿掉锯齿，副歌就空了。", [36, 48], [36, 48, 72], { label: "主歌保留两层", midis: [36, 48] }),
      ear("808-job", "这个骨架里 808 的任务是？", "接住根音和低频", "加高频", "808 管低频根音，高频是 supersaw 和 chop 的活。", [36], [72], { label: "加高频", midis: [72] }),
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
  }),
  lesson({
    id: 20,
    title: "Kawaii bass 的声音特征",
    marker: "Level20",
    totalBars: 4,
    prereq: [19, 6],
    concept: [
      "Kawaii bass 比 future bass 更亮、更轻。和弦常用大七或加九，拍手比厚重的军鼓更靠前。",
      "又暗又低、只有 808 的写法更像另一边。这边要把和弦抬到高八度，并留下拍手的颗粒。",
      "「亮」在技术上落在两处：和弦音区抬高八度，和弦色彩换成 maj7 / add9。低音再低也不影响亮不亮——亮由中高频决定。",
      "「轻」来自鼓的配比：军鼓的瞬态很硬，会把歌压重。把拍手往前摆、军鼓收掉或垫软，节奏就跳起来而不沉。",
      "这两个特征是可以拆开用的：想要亮但不要轻 → 留军鼓、换加九和弦；想要轻但不要亮 → 用 clap 加高八度但和弦保持普通大三。",
    ],
    ear: [
      ear("chord-color", "哪种和弦更贴这风格？", "C E G D（加九）", "C Eb Gb", "加九是亮的。减和弦太暗。", [60, 64, 67, 74], [60, 63, 66], { label: "C Eb G Bb", midis: [60, 63, 67, 70] }),
      ear("clap", "节奏上更常突出谁？", "拍手", "只留一个很闷的踢", "拍手让它变轻、变跳。", [39], [36], { label: "808", midis: [36] }),
      ear("register", "和弦音区？", "偏高", "和 808 同一个八度", "高八度才明亮。", [84], [36], { label: "很低", midis: [48] }),
      ear("not", "下面哪个不像？", "全程小调减七", "大七、加九、拍手", "减七的色彩太沉。", [60, 63, 66, 69], [60, 64, 67, 74], { label: "高八度和弦", midis: [84] }),
      ear("bass", "贝斯还要不要？", "要，但别盖住高音和弦", "不要低音", "低音还在，只是不独占。", [48], [48], { label: "要并且独占低频", midis: [28] }),
      ear("vs-future", "这个风格相对 future bass 更？", "亮、轻", "暗、重", "亮和轻是这个风格的两根支柱，其余元素可以不变。", [84], [48], { label: "暗、重", midis: [28] }),
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
  }),
  lesson({
    id: 21,
    title: "Vocal chop 入门",
    marker: "Level21",
    totalBars: 1,
    prereq: [19],
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
  }),
  lesson({
    id: 22,
    title: "副歌抬一层",
    marker: "Level22",
    totalBars: 8,
    showEnergy: true,
    prereq: [13, 19],
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
      ear("what-add", "副歌具体加上什么？", "一条新的和弦轨", "把主歌音量调小", "加层是多一条轨，不是把主歌变小声。", [72], [72], { label: "把 kick 删掉", midis: [36] }),
      ear("both", "抬层要同时满足几件事？", "能量倍数和层数", "只看力度", "1.5 倍能量，并且层数多 1。", [72], [72], { label: "只看音色", midis: [72] }),
      ear("where-bar", "四小节主歌之后，副歌从哪一小节开始？", "第 5 小节", "第 1 小节", "前四小节是主歌，第五小节进副歌。", [72], [72], { label: "第 9 小节", midis: [72] }),
      ear("chart", "能量曲线在副歌应该？", "明显升高", "继续平着", "平的曲线就是没抬。", [72], [72], { label: "先降后升", midis: [72] }),
      ear("keep-kick", "主歌的 kick 到了副歌？", "还在", "必须删掉", "节奏底盘留着，上面再加层。", [36, 72], [72], { label: "换成 808", midis: [36] }),
      ear("vel-only", "只把副歌力度调大但不加轨，能算抬层吗？", "不算", "算", "层数没变就不算抬层，只是变响。", [72], [72], { label: "算一半", midis: [72] }),
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
  }),
  lesson({
    id: 23,
    title: "从零编 16 小节",
    marker: "Level23",
    totalBars: 16,
    bpm: 150,
    prereq: [22, 19],
    sections: [
      { name: "Intro", startBar: 0, bars: 4 },
      { name: "Verse", startBar: 4, bars: 4 },
      { name: "Chorus", startBar: 8, bars: 8 },
    ],
    concept: [
      "16 小节够放前奏、主歌和副歌。前奏 4，主歌 4，副歌 8。和声可以循环 I–V–vi–IV。",
      "副歌比主歌多 supersaw 这一层，踢和 808 从头把根音和拍子接住。这就是一首能听完的最小骨架。",
      "为什么副歌给 8 小节而不是 4：副歌是记忆点，需要够长让听众记住。4 小节的副歌刚起势就结束了，没有落点。",
      "前奏的 4 小节不是白给的：它给听众一个「进副歌之前先别走」的悬念，同时让 kick 和 808 的节奏先建立起来。前奏里放的和声通常是主歌和声的预演。",
      "编完 16 小节后要做三件事：听一遍能量曲线有没有台阶 → 检查所有和弦在不在调内 → 确认副歌比主歌多一条轨。这三条过了，这首歌的骨架就成立了，剩下的都是 Cubase 里的活。",
    ],
    ear: [
      ear("length", "这一关的长度是？", "16 小节", "1 小节", "要够放前奏、主歌、副歌。", [36], [36], { label: "4 小节", midis: [36] }),
      ear("intro", "前奏占几小节？", "4", "16", "前 4 小节是 Intro。", [36], [36], { label: "8", midis: [36] }),
      ear("chorus-len", "副歌从第 9 小节开始，占几小节？", "8", "2", "后一半留给副歌。", [36], [36], { label: "16", midis: [36] }),
      ear("harmony", "循环的进行是？", "I–V–vi–IV", "随便四个调外和弦", "用已经练过的那条进行。", [60, 67, 69, 65], [60, 66, 69, 65], { label: "只有 I 和 V", midis: [60, 67] }),
      ear("lift", "副歌相对主歌？", "多 supersaw", "把踢删掉", "抬的是和弦层，不是拆掉节奏。", [72], [36], { label: "把 808 删掉", midis: [36] }),
      ear("808-job", "这首 16 小节里 808 的作用是？", "接住根音", "提供高频", "808 管低频根音，高频交给 supersaw。", [36], [72], { label: "代替 supersaw", midis: [72] }),
    ],
    handPrompt: "选出结构完整的 16 小节。",
    handChoices: [
      choice("前奏、主歌、抬起来的副歌", [], loopChords(16), [
        track("KICK", 9, kicks(16)),
        track("808", 0, notesAt(Array.from({ length: 16 }, (_, index) => index), 36, 96, BAR - 20)),
        track("SUPERSAW", 2, notesAt([8, 9, 10, 11, 12, 13, 14, 15], 72, 90)),
      ]),
      choice("16 小节但副歌没有新层", [], loopChords(16), [
        track("KICK", 9, kicks(16)),
        track("808", 0, notesAt(Array.from({ length: 16 }, (_, index) => index), 36, 96, BAR - 20)),
      ]),
    ],
    handCorrect: 0,
  }),
  lesson({
    id: 24,
    title: "参考曲分析",
    marker: "Level24",
    totalBars: 16,
    reference: true,
    prereq: [23],
    concept: [
      "参考曲只在浏览器里看，不上传到服务器。分析不必一次猜对：先给出几个 BPM、几个调、两套结构，你来选更像的那一个。",
      "没有手头的歌时，用示例鼓点也行。选完一套候选，就按你选的速度和段落导出一条骨架。准确率不够就降级成候选，不要卡在这里。",
      "为什么这一关放在最后：参考曲分析不是新的知识点，而是把前面 23 关的工具反过来用一遍——你会听级数、会看能量曲线、会认段落，才能对着一首歌做判断。",
      "分析的顺序也有讲究：先定 BPM（最容易听准），再定调（听主音在哪、有没有小调色彩），最后才定结构（结构依赖速度和调都确定之后）。反过来做会一直返工。",
      "这一关的诚实边界：浏览器里的自动分析准确率有限，尤其在小调、有转调、或者混音很满的曲子上。所以设计成「给候选、你选」，而不是给一个断言让你信。",
    ],
    ear: [
      ear("bpm-means", "BPM 候选指的是？", "速度", "音量", "BPM 是一分钟多少拍。", [60], [60], { label: "和弦级数", midis: [60] }),
      ear("key-means", "调性候选指的是？", "主音和大调或小调", "哪一条轨是踢", "调是音高的归属，不是鼓。", [60], [60], { label: "采样率", midis: [60] }),
      ear("structure-means", "结构候选指的是？", "前奏、主歌、副歌怎么分", "和弦用什么音色", "结构是段落，不是音色。", [60], [60], { label: "混响多重", midis: [60] }),
      ear("local", "音频文件去哪了？", "只在这台浏览器里算", "传到服务器", "没有后端。音频在你本机的浏览器里解码和分析，不会上传到任何地方。", [60], [60], { label: "存到云盘", midis: [60] }),
      ear("fallback", "分析不准时怎么办？", "从候选里选一个能用的", "必须等到唯一正确答案", "候选就是降级方案。", [60], [60], { label: "放弃这一关", midis: [60] }),
      ear("output", "选完候选之后会得到什么？", "一条按你选的速度和段落排好的骨架", "一个成品混音", "网站给你的是骨架，成品要在 Cubase 里做。", [60], [60], { label: "一个成品混音", midis: [60] }),
    ],
    handPrompt: "从候选里各选一个。没有文件就先用示例鼓点。",
    handChoices: [],
    handCorrect: 0,
  }),
];
