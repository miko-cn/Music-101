import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  GM_DRUM_PITCH,
  barToTick,
  skeletonToMidi,
  type SkeletonChord,
  type SkeletonNote,
  type SongSkeleton,
} from "../src/core/midi/project.ts";
import { PPQ } from "../src/core/midi/types.ts";
import { writeMidiFile } from "../src/core/midi/writer.ts";
import { getChordPitches, romanNumeral, type Chord } from "../src/core/theory/chord.ts";
import type { PitchClass } from "../src/core/theory/pitch.ts";

const BPM = 150;
const BEATS_PER_BAR = 4;
const TOTAL_BARS = 8;
const KEY_ROOT: PitchClass = 6; // F#

interface ProgressionEntry {
  startBar: number;
  chord: Chord;
  label: string;
}

/** F# 小调：i – ♭VI – IV – I，每段两小节。 */
const PROGRESSION: ProgressionEntry[] = [
  { startBar: 0, chord: { root: 6, quality: "min" }, label: "F#m" },
  { startBar: 2, chord: { root: 2, quality: "maj" }, label: "D" },
  { startBar: 4, chord: { root: 11, quality: "maj" }, label: "B" },
  { startBar: 6, chord: { root: 6, quality: "maj" }, label: "F#" },
];

const sections = [
  { name: "Intro", startBar: 0, bars: 2 },
  { name: "Verse", startBar: 2, bars: 2 },
  { name: "PreChorus", startBar: 4, bars: 2 },
  { name: "Chorus", startBar: 6, bars: 2 },
];

export interface DemoSong {
  skeleton: SongSkeleton;
  /** 和声进行的标记文本，每个和弦一次，不含按小节重复的铺音。 */
  progressionText: string;
}

/**
 * 以根音为基准把和弦音排进同一个八度。
 * 直接给音级加常数会让 C#（音级 1）落到根音下方，得到 F#3 + A3 + C#3 这种错位排列。
 */
function voiceChord(pitches: readonly number[], root: number, base: number): number[] {
  return pitches.map(
    (pitch) => base + root + ((((pitch - root) % 12) + 12) % 12),
  );
}

/** 搭出 Cubase 导入检查用的 8 小节演示骨架。规格 3.7：CHORDS 轨每小节一组三和弦。 */
export function createDemoSong(): DemoSong {
  const kickNotes: SkeletonNote[] = [];
  for (let bar = 0; bar < TOTAL_BARS; bar += 1) {
    for (const beat of [0, 1, 2, 3]) {
      kickNotes.push({
        tick: barToTick(bar, BEATS_PER_BAR) + beat * PPQ,
        dur: 120,
        pitch: GM_DRUM_PITCH.KICK,
        vel: 110,
      });
    }
  }

  const bassNotes: SkeletonNote[] = [];
  const subNotes: SkeletonNote[] = [];
  const supersawNotes: SkeletonNote[] = [];
  const chords: SkeletonChord[] = [];
  const progressionLabels: string[] = [];

  for (const entry of PROGRESSION) {
    const pitches = getChordPitches(entry.chord);
    const numeral = romanNumeral(entry.chord, KEY_ROOT);
    const text = `${entry.label} (${numeral})`;
    progressionLabels.push(text);

    for (let bar = entry.startBar; bar < entry.startBar + 2; bar += 1) {
      const base = barToTick(bar, BEATS_PER_BAR);
      chords.push({
        tick: base,
        pitches: voiceChord(pitches, entry.chord.root, 48),
        text,
        omitMarker: bar !== entry.startBar,
      });
      // 808：低八度根音长音，只占低频，把瞬态空间留给 kick
      for (const beat of [0, 2]) {
        subNotes.push({
          tick: base + beat * PPQ,
          dur: PPQ * 2 - 20,
          pitch: 24 + entry.chord.root,
          vel: 100,
        });
      }
      // BASS：中八度根音，每拍一个
      for (let beat = 0; beat < BEATS_PER_BAR; beat += 1) {
        bassNotes.push({
          tick: base + beat * PPQ,
          dur: PPQ - 20,
          pitch: 36 + entry.chord.root,
          vel: 100,
        });
      }
      // SUPERSAW：两个高八度层的和弦音
      for (const pitch of voiceChord(pitches, entry.chord.root, 60)) {
        supersawNotes.push({ tick: base, dur: PPQ * 4 - 20, pitch, vel: 80 });
      }
      for (const pitch of voiceChord(pitches, entry.chord.root, 72)) {
        supersawNotes.push({ tick: base, dur: PPQ * 4 - 20, pitch, vel: 70 });
      }
    }
  }

  const skeleton: SongSkeleton = {
    bpm: BPM,
    keyRoot: KEY_ROOT,
    keyScale: "naturalMinor",
    beatsPerBar: BEATS_PER_BAR,
    totalBars: TOTAL_BARS,
    sections,
    tracks: [
      { role: "KICK", channel: 9, notes: kickNotes },
      { role: "808", channel: 0, notes: subNotes },
      { role: "BASS", channel: 1, notes: bassNotes },
      { role: "SUPERSAW", channel: 2, notes: supersawNotes },
    ],
    chords,
  };

  return { skeleton, progressionText: progressionLabels.join(" | ") };
}

function isDirectRun(): boolean {
  const entry = process.argv[1];
  if (entry === undefined) return false;
  return import.meta.url === pathToFileURL(resolve(entry)).href;
}

if (isDirectRun()) {
  const { skeleton, progressionText } = createDemoSong();
  const outputPath = resolve(process.cwd(), "out", "music101-test.mid");
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, writeMidiFile(skeletonToMidi(skeleton)));

  console.log(`已生成 ${outputPath}`);
  console.log(`轨道：${skeleton.tracks.map((track) => track.role).join(", ")} + CHORDS`);
  console.log(`速度 ${BPM} BPM，${TOTAL_BARS} 小节，段落：${sections.map((section) => section.name).join(" / ")}`);
  console.log(`进行：${progressionText}`);
}
