import type { PitchClass } from "../core/theory/pitch.ts";
import type { ScaleId } from "../core/theory/scale.ts";
import type { SkeletonChord, SkeletonNote, TrackRole } from "../core/midi/project.ts";
import { PPQ } from "../core/midi/types.ts";
import type { DrumLaneSpec, StageChoice, StageEar, StageLesson } from "./stage1.ts";

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

function ear(
  id: string,
  prompt: string,
  correctLabel: string,
  wrongLabel: string,
  explain: string,
  correctMidis: number[] = [60],
  wrongMidis: number[] = [61],
): StageEar {
  return {
    id,
    prompt,
    choices: [
      { label: correctLabel, midis: correctMidis },
      { label: wrongLabel, midis: wrongMidis },
    ],
    correct: 0,
    explain,
  };
}

function lesson(
  partial: Pick<StageLesson, "id" | "title" | "concept" | "ear" | "handPrompt" | "handChoices" | "handCorrect" | "totalBars" | "marker"> &
    Partial<StageLesson>,
): StageLesson {
  return {
    earPass: 4,
    bpm: 140,
    keyRoot: 0 as PitchClass,
    keyScale: "major" as ScaleId,
    ...partial,
  };
}

const hats = [0, 2, 4, 6, 8, 10, 12, 14];

export const ARRANGING_LESSONS: readonly StageLesson[] = [
  lesson({
    id: 9,
    title: "织体：什么是层",
    marker: "Level9",
    totalBars: 4,
    concept: [
      "一层就是一条同时在响的轨道。同一条轨里再叠几个音，仍然只算一层。",
      "副歌如果还是主歌那一条贝斯，听起来就不会抬起来。多加 kick 和 supersaw，才是在加层。",
    ],
    ear: [
      ear("layers-count", "哪个编制层更多？", "贝斯 + kick + supersaw", "只有贝斯", "三条轨是三层，一条贝斯只是一层。", [36, 48, 72], [48]),
      ear("same-track", "同一个和弦里的三个音算几层？", "一层", "三层", "层按轨道数，不按音符个数。"),
      ear("chorus-need", "副歌通常要比主歌怎样？", "多至少一层", "少一层", "抬层的意思就是副歌的轨道更多。"),
      ear("fx-not-layer", "哪条轨不算进层数？", "FX", "BASS", "扫频和音效是装饰，FX、CHOP 不计入层。"),
      ear("empty", "这一小节没有任何音，层数是？", "0", "1", "没有轨道在响，层数就是 0。"),
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
    concept: [
      "四件套是 kick、snare、clap、hat。一格是一个十六分音符，一拍四格。",
      "最稳的一句：踢在第 1 和第 9 格（第 1、3 拍），军鼓和拍手在第 5 和第 13 格（第 2、4 拍），踩镲把八分音符铺满。",
    ],
    ear: [
      ear("kick-place", "踢通常落在哪两拍？", "第 1 拍和第 3 拍", "第 2 拍和第 4 拍", "第 1、3 拍是强拍，留给 kick。"),
      ear("snare-place", "军鼓通常落在哪两拍？", "第 2 拍和第 4 拍", "每一拍", "反拍上的军鼓让句子往前走。"),
      ear("hat-rate", "踩镲铺八分音符，一拍有几下？", "两下", "一下", "八分音符是一拍两下，十六分音符才是一拍四下。"),
      ear("clap-with", "拍手最常和谁一起？", "军鼓", "踢", "拍手叠在军鼓的反拍上，把反拍变厚。"),
      ear("grid", "第 5 格是第几拍的第一格？", "第 2 拍", "第 3 拍", "1–4 格是第 1 拍，5–8 格是第 2 拍。"),
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
    concept: [
      "kick 要短，占的是一下一下的冲击。808 要长，占的是根音那条持续的低频。",
      "808 如果低到 MIDI 33 以下，又和 kick 落在同一小节，低频会糊成一块。根音放在 36 附近，把更低的位置留给 kick 的瞬态。",
    ],
    ear: [
      ear("who-short", "哪个该是短音？", "kick", "808", "kick 负责冲击，时值短。808 负责根音，时值长。"),
      ear("who-root", "哪个负责和弦根音？", "808", "hat", "808 跟着和声的根音走，帽子只负责节奏。"),
      ear("too-low", "808 低到多少开始容易和 kick 打架？", "MIDI 33 以下", "MIDI 60 以上", "低于 MIDI 33 大约就是 45Hz 以下。"),
      ear("same-bar", "低频冲突还要满足什么？", "同一小节里也有 kick", "只要 808 很低就一定冲突", "低，并且跟 kick 叠在同一小节，才算冲突。"),
      ear("pitch-36", "根音放在 MIDI 36，算不算已经低到冲突线以下？", "不算", "算", "36 比 33 高，还在可用的根音区。"),
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
    concept: [
      "侧链是 kick 一响，就把 808 或 supersaw 的音量按下去，kick 走了再抬回来。网页里这是真的 Gain 自动化，不是一个假装在抽的效果器。",
      "泵动跟在 kick 上。如果 808 一直满音量，kick 会被低频盖住。",
    ],
    ear: [
      ear("when", "音量该在什么时候被按下去？", "每个 kick 打下去的时候", "只在歌曲结尾", "侧链跟着 kick 走，不是只在结尾抽一下。"),
      ear("who-ducked", "被按下去的通常是谁？", "808 或 supersaw", "kick 自己", "kick 要露出来，所以是别的长音让路。"),
      ear("back", "kick 离开之后音量怎样？", "再抬回来", "一直保持很小", "抬回来才听得见和弦，也才有一抽一抽的感觉。"),
      ear("not-midi", "导出的 MIDI 里有没有侧链曲线？", "没有，得到 Cubase 里再做", "有，拖进去就自动泵", "MIDI 带的是音高和节奏。泵动是混音，不在这个文件里。"),
      ear("grid-kick", "四四拍的 kick 一小节抽几次？", "四次", "一次", "每拍一个 kick，就抽四次。"),
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
    sections: [
      { name: "Verse", startBar: 0, bars: 4 },
      { name: "Chorus", startBar: 4, bars: 4 },
    ],
    concept: [
      "主歌和副歌要标出来。能量按「层数 × 音区权重 × 平均力度」算。",
      "副歌抬层要同时满足两件：平均能量至少是主歌的 1.5 倍，而且平均层数至少多 1。",
    ],
    ear: [
      ear("names", "哪两个段落是拿来比能量的？", "主歌和副歌", "前奏和尾奏", "抬层看的是副歌相对主歌。"),
      ear("ratio", "副歌能量至少要到主歌的几倍？", "1.5 倍", "一样就行", "只高一点点不算抬起来。"),
      ear("layers", "除了能量，层数还要怎样？", "至少多 1 层", "可以更少", "两条都要满足。"),
      ear("weight", "最低音在 MIDI 60 以下，音区权重是？", "1.0", "0.4", "越低的音，能量权重越大。"),
      ear("marker", "段落写进 MIDI 的哪里？", "Marker", "和弦 meta 事件", "首版只写 Marker，不写和弦 meta。"),
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
    concept: [
      "V 级想解决到 I。在 C 大调里，G 大三后面接 C 大三，张力放掉。",
      "如果 V 后面还是 V，句子会停在半空。解决不是把和弦弹响一点，是让它回到主和弦。",
    ],
    ear: [
      ear("v-chord", "C 大调的 V 是哪个？", "G B D", "F A C", "第 5 级是 G。", [67, 71, 74], [65, 69, 72]),
      ear("resolve-to", "V 最常解决到哪里？", "I", "vi", "属和弦回到主和弦。"),
      ear("which-pair", "哪一对是解决？", "G → C", "G → G", "第二个和弦换成了主和弦，张力才落地。", [67, 60], [67, 67]),
      ear("tense", "一直停在 V 上，听感是？", "悬着", "已经结束", "没有回到 I，句子还没完。"),
      ear("in-key", "G 和 C 都在 C 大调里吗？", "在", "不在", "两个都是调内和弦，差别是张力，不是调外。"),
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
    concept: [
      "kick 待在最低的地方，贝斯在它上面一点，supersaw 再往上。每条轨有自己的频段。",
      "如果大家都挤在中央 C 附近，中频会糊。频率重心离得太近，诊断就会说它们打架。",
    ],
    ear: [
      ear("kick-band", "kick 该待在哪？", "最低", "和主旋律同一个八度", "踢是低频的冲击，不跟旋律抢位置。"),
      ear("saw-band", "supersaw 更适合哪？", "中高频", "和 kick 同一个音", "锯齿铺的是和弦的中高频。"),
      ear("same-note", "两条轨都只弹 MIDI 60，容易怎样？", "挤在中频", "自动分成高低", "音高一样，重心就挨在一起。"),
      ear("role", "贝斯的角色是？", "接在 kick 上面的根音", "代替踩镲", "贝斯管和声的低音，不管节奏的帽子。"),
      ear("count", "频段规则会拿掉哪类轨？", "FX 和 CHOP", "BASS", "装饰轨不参加频段比较。"),
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
    concept: [
      "厚度来自叠八度，不是把所有乐器都塞进同一个音。贝斯在低八度，和弦在高八度，中间才透气。",
      "只在一个八度里堆，歌会窄。低一个八度再高一个八度，同一条和声就有宽度。",
    ],
    ear: [
      ear("octave-stack", "叠八度是什么意思？", "同一个音名，差一个或两个八度一起响", "把所有音都移到 C4", "C3 和 C4 一起，是厚度；全挤在 C4，是窄。"),
      ear("bass-octave", "贝斯相对和弦通常怎样？", "低一个八度", "高两个八度", "低频留给贝斯。"),
      ear("not-layers", "两个八度的同一件乐器算什么？", "厚度，不是多一种角色", "自动变成鼓", "还是同一类声音，只是音区拉开了。"),
      ear("narrow", "所有旋律都在 MIDI 60 附近，听感是？", "窄", "已经很宽", "没有音区差，就没有厚度。"),
      ear("chord-high", "supersaw 适合叠在哪？", "比贝斯高的八度", "和 kick 同一个键", "高八度的和弦把中高频铺开。"),
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
    sections: [
      { name: "Verse", startBar: 0, bars: 4 },
      { name: "Chorus", startBar: 4, bars: 4 },
    ],
    concept: [
      "力度让歌呼吸。主歌收着点，副歌推上去。全程同一个力度，段落会糊成一条直线。",
      "这里先把主歌力度放在 70，副歌放到 110。层可以先不变，单靠力度也能让曲线动起来。",
    ],
    ear: [
      ear("verse-vel", "主歌力度更适合？", "收一点，大约 70", "从头到尾 127", "主歌留着余地，副歌才推得上去。"),
      ear("chorus-vel", "副歌力度相对主歌？", "更大", "更小", "副歌是要出来的那一段。"),
      ear("flat", "全程力度一样，听感是？", "不呼吸", "自动有段落", "力度不变，动态就是平的。"),
      ear("not-only", "力度是能量公式里的哪一项？", "平均力度", "层数本身", "能量是层、音区、力度乘在一起。"),
      ear("where", "力度写在 MIDI 的哪里？", "音符的 velocity", "Marker 文本", "每个音自己带力度。"),
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
    concept: [
      "失真、滤波、混响、延迟、glitch 都是效果。它们负责把段落接起来，不是从头到尾糊住。",
      "滤波扫频适合放在进副歌前的那一小节。全程失真会把 kick 和贝斯的分工一起抹掉。",
    ],
    ear: [
      ear("where-fx", "扫频更适合放在哪？", "进副歌前的过渡", "每一个踢上", "过渡需要把能量推上去，扫频干的就是这个。"),
      ear("not-always", "全程失真的问题是？", "角色都糊在一起", "这样最清楚", "效果用在该用的地方，不是默认打开。"),
      ear("kinds", "下面哪个是效果而不是一件乐器？", "滤波扫频", "kick", "kick 是节奏层，扫频是效果。"),
      ear("midi", "MIDI 里的 FX 轨表示什么？", "这里有一段效果该出现", "Cubase 会自动加载混响", "文件只告诉你位置和音高，插件要自己加。"),
      ear("glitch", "glitch 更像？", "把过渡切碎", "把贝斯拉成无限长", "它是节奏型的破碎，不是一条长低音。"),
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
    sections: [
      { name: "Verse", startBar: 0, bars: 4 },
      { name: "Chorus", startBar: 4, bars: 4 },
    ],
    concept: [
      "Future bass 的骨架是：主歌留 kick 和贝斯，副歌把 supersaw 和弦铺开，再用短的 chop 卡在反拍上。",
      "没有副歌那一层锯齿，它就还是一条空的主歌。",
    ],
    ear: [
      ear("drop", "Future bass 的副歌最显耳的是？", "supersaw 和弦", "只有帽子", "副歌靠铺开的锯齿和弦。", [72, 76, 79], [42]),
      ear("chop-place", "chop 更适合？", "短，卡在反拍", "从头拉到尾", "切片要短，才像人声碎片。"),
      ear("verse", "主歌相对副歌？", "层更少", "层更多", "主歌把空间留给副歌。"),
      ear("kick", "踢在这种骨架里？", "主歌副歌都在", "只在前奏出现一次", "踢把拍子钉住。"),
      ear("not-style", "下面哪个不像这个骨架？", "副歌把 supersaw 拿掉", "副歌加上锯齿和弦", "拿掉锯齿，副歌就空了。"),
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
    concept: [
      "Kawaii bass 比 future bass 更亮、更轻。和弦常用大七或加九，拍手比厚重的军鼓更靠前。",
      "又暗又低、只有 808 的写法更像另一边。这边要把和弦抬到高八度，并留下拍手的颗粒。",
    ],
    ear: [
      ear("chord-color", "哪种和弦更贴这风格？", "C E G D（加九）", "C Eb Gb", "加九是亮的。减和弦太暗。", [60, 64, 67, 74], [60, 63, 66]),
      ear("clap", "节奏上更常突出谁？", "拍手", "只留一个很闷的踢", "拍手让它变轻、变跳。"),
      ear("register", "和弦音区？", "偏高", "和 808 同一个八度", "高八度才明亮。"),
      ear("not", "下面哪个不像？", "全程小调减七", "大七、加九、拍手", "减七的色彩太沉。"),
      ear("bass", "贝斯还要不要？", "要，但别盖住高音和弦", "不要低音", "低音还在，只是不独占。"),
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
    concept: [
      "Chop 是把一个短音切成几片，卡在十六分音符的空拍上，而不是唱一整句长音。",
      "先别管歌词。节奏上，第 2、4、6… 这些离拍的格子比正拍更像切片。",
    ],
    ear: [
      ear("short", "chop 的时值？", "短", "拉满一整小节", "切片要能分开，长音就变成铺底了。"),
      ear("offbeat", "更像 chop 的位置？", "反拍和十六分的空位", "只在每小节第一下", "正拍通常留给 kick。"),
      ear("role", "它在编曲里更接近？", "节奏性的旋律碎片", "低频根音", "chop 不负责 808 的工作。"),
      ear("count", "一拍切成四格的话，空拍可以落在？", "第 2 和第 4 格", "只能落在第 1 格", "16 格里，每拍的后半留给碎片。"),
      ear("export", "导出时这条轨叫？", "CHOP", "KICK", "角色写在轨名里，进宿主再换音色。"),
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
    sections: [
      { name: "Verse", startBar: 0, bars: 4 },
      { name: "Chorus", startBar: 4, bars: 4 },
    ],
    concept: [
      "抬一层不是把副歌的音量旋钮拧大一点就算完。层数要多一条，能量还要到主歌的 1.5 倍。",
      "具体做法：主歌留 kick 和贝斯，副歌加上 supersaw。曲线从第 5 小节抬上去，才算副歌。",
    ],
    ear: [
      ear("what-add", "副歌具体加上什么？", "一条新的和弦轨", "把主歌音量调小", "加层是多一条轨，不是把主歌变小声。"),
      ear("both", "抬层要同时满足几件事？", "能量倍数和层数", "只看力度", "1.5 倍能量，并且层数多 1。"),
      ear("where-bar", "四小节主歌之后，副歌从哪一小节开始？", "第 5 小节", "第 1 小节", "前四小节是主歌，第五小节进副歌。"),
      ear("chart", "能量曲线在副歌应该？", "明显升高", "继续平着", "平的曲线就是没抬。"),
      ear("keep-kick", "主歌的 kick 到了副歌？", "还在", "必须删掉", "节奏底盘留着，上面再加层。"),
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
    sections: [
      { name: "Intro", startBar: 0, bars: 4 },
      { name: "Verse", startBar: 4, bars: 4 },
      { name: "Chorus", startBar: 8, bars: 8 },
    ],
    concept: [
      "16 小节够放前奏、主歌和副歌。前奏 4，主歌 4，副歌 8。和声可以循环 I–V–vi–IV。",
      "副歌比主歌多 supersaw 这一层，踢和 808 从头把根音和拍子接住。这就是一首能听完的最小骨架。",
    ],
    ear: [
      ear("length", "这一关的长度是？", "16 小节", "1 小节", "要够放前奏、主歌、副歌。"),
      ear("intro", "前奏占几小节？", "4", "16", "前 4 小节是 Intro。"),
      ear("chorus-len", "副歌从第 9 小节开始，占几小节？", "8", "2", "后一半留给副歌。"),
      ear("harmony", "循环的进行是？", "I–V–vi–IV", "随便四个调外和弦", "用已经练过的那条进行。"),
      ear("lift", "副歌相对主歌？", "多 supersaw", "把踢删掉", "抬的是和弦层，不是拆掉节奏。"),
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
    concept: [
      "参考曲只在浏览器里看，不上传到服务器。分析不必一次猜对：先给出几个 BPM、几个调、两套结构，你来选更像的那一个。",
      "没有手头的歌时，用示例鼓点也行。选完一套候选，就按你选的速度和段落导出一条骨架。准确率不够就降级成候选，不要卡在这里。",
    ],
    ear: [
      ear("bpm-means", "BPM 候选指的是？", "速度", "音量", "BPM 是一分钟多少拍。"),
      ear("key-means", "调性候选指的是？", "主音和大调或小调", "哪一条轨是踢", "调是音高的归属，不是鼓。"),
      ear("structure-means", "结构候选指的是？", "前奏、主歌、副歌怎么分", "和弦用什么音色", "结构是段落，不是音色。"),
      ear("local", "音频文件去哪了？", "只在这台浏览器里算", "传到服务器", "没有后端。"),
      ear("fallback", "分析不准时怎么办？", "从候选里选一个能用的", "必须等到唯一正确答案", "候选就是降级方案。"),
    ],
    handPrompt: "从候选里各选一个。没有文件就先用示例鼓点。",
    handChoices: [],
    handCorrect: 0,
  }),
];
