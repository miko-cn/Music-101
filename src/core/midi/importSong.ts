import type { AnalysisNote, AnalysisSong, AnalysisTrack } from "../analyze/song.ts";
import type { PitchClass } from "../theory/pitch.ts";
import type { ScaleId } from "../theory/scale.ts";
import { CHORD_TRACK_NAME, type TrackRole } from "./project.ts";
import { PPQ, type MidiFile, type MidiTrack } from "./types.ts";

const KNOWN_ROLES: readonly TrackRole[] = [
  "KICK",
  "SNARE",
  "CLAP",
  "HAT",
  "808",
  "BASS",
  "SUPERSAW",
  "CHOP",
  "ARP",
  "FX",
  "MELODY",
  "CHORDS",
];

const SECTION_NAMES = new Set([
  "intro",
  "verse",
  "prechorus",
  "pre-chorus",
  "chorus",
  "drop",
  "outro",
  "bridge",
  "主歌",
  "副歌",
  "前奏",
  "桥段",
  "尾奏",
]);

export interface ImportedTrack {
  name: string;
  role: TrackRole | null;
  notes: number;
}

export interface ImportedMarker {
  tick: number;
  bar: number;
  text: string;
  section: boolean;
}

export interface ImportedMidi {
  bpm: number | null;
  tempoCount: number;
  ppq: number;
  beatsPerBar: number;
  /** 文件里读到的拍号。没有时 beatsPerBar 按 4/4 算。 */
  timeSignature: { numerator: number; denominator: number } | null;
  tracks: ImportedTrack[];
  markers: ImportedMarker[];
  /** 文件里没有、因此没有拿来下判断的东西。 */
  gaps: string[];
  song: AnalysisSong;
}

export function roleFromTrackName(name: string): TrackRole | null {
  const key = name.trim().toUpperCase();
  if (key === CHORD_TRACK_NAME) return "CHORDS";
  return KNOWN_ROLES.find((role) => role === key) ?? null;
}

export function isSectionMarker(text: string): boolean {
  const compact = text.trim().toLowerCase().replace(/[\s-]/g, "");
  return SECTION_NAMES.has(compact) || SECTION_NAMES.has(text.trim());
}

function scaleTick(tick: number, ppq: number): number {
  if (ppq === PPQ || ppq <= 0) return tick;
  return Math.round((tick * PPQ) / ppq);
}

function beatsFromSignature(numerator: number, denominator: number): number {
  if (numerator <= 0 || denominator <= 0) return 4;
  const quarters = (numerator * 4) / denominator;
  const rounded = Math.round(quarters);
  return rounded > 0 ? rounded : 4;
}

function collectNotes(track: MidiTrack, ppq: number): { notes: AnalysisNote[]; unmatched: number } {
  const pending: { tick: number; pitch: number; vel: number }[] = [];
  const notes: AnalysisNote[] = [];
  for (const event of track.events) {
    if (event.kind === "noteOn") {
      pending.push({ tick: event.tick, pitch: event.pitch, vel: event.velocity });
    } else if (event.kind === "noteOff") {
      const index = pending.findIndex((item) => item.pitch === event.pitch);
      if (index < 0) continue;
      const [start] = pending.splice(index, 1);
      if (!start) continue;
      notes.push({
        tick: scaleTick(start.tick, ppq),
        dur: Math.max(1, scaleTick(event.tick, ppq) - scaleTick(start.tick, ppq)),
        pitch: start.pitch,
        vel: start.vel,
      });
    }
  }
  const unmatched = pending.length;
  for (const start of pending) {
    notes.push({
      tick: scaleTick(start.tick, ppq),
      dur: 1,
      pitch: start.pitch,
      vel: start.vel,
    });
  }
  return { notes, unmatched };
}

/** 把已读入的 MIDI 变成诊断用的歌。调性不从音高猜，由调用方传入。 */
export function importMidi(
  midi: MidiFile,
  options: { keyRoot?: PitchClass; keyScale?: ScaleId } = {},
): ImportedMidi {
  const ppq = midi.ppq > 0 ? midi.ppq : PPQ;
  const tempos = midi.tracks.flatMap((track) => track.events.filter((event) => event.kind === "tempo"));
  const firstTempo = tempos[0];
  const bpm = firstTempo ? Math.round(60_000_000 / firstTempo.microsecondsPerBeat) : null;
  const signature = midi.tracks
    .flatMap((track) => track.events)
    .find((event) => event.kind === "timeSignature");
  const timeSignature = signature ? { numerator: signature.numerator, denominator: signature.denominator } : null;
  const beatsPerBar = timeSignature ? beatsFromSignature(timeSignature.numerator, timeSignature.denominator) : 4;
  const barTicks = beatsPerBar * PPQ;

  const gaps = [
    "文件里没有侧链。泵动是混音自动化，MIDI 不带这个。",
    "文件里没有音色。这里只有音高和力度，没有插件参数。",
    "文件里没有音量自动化。力度是每个音自己的 velocity。",
    "文件里没有调性。和声规则用你选的调，不是从音高猜的。",
    "借用和弦按关卡 8 之后放行。文件里没有这一项。",
  ];
  if (!timeSignature) gaps.push("文件里没有拍号，小节按 4/4 算。");
  if (tempos.length === 0) gaps.push("文件里没有速度。");
  if (tempos.length > 1) gaps.push(`文件里有 ${tempos.length} 个速度，这里只用第一个。`);

  let unmatched = 0;
  const tracks: ImportedTrack[] = [];
  const analysisTracks: AnalysisTrack[] = [];
  let lastTick = 0;

  for (const track of midi.tracks) {
    const named = track.events.find((event) => event.kind === "trackName");
    const name = track.name || (named?.kind === "trackName" ? named.text : "") || "未命名";
    const collected = collectNotes(track, ppq);
    unmatched += collected.unmatched;
    for (const note of collected.notes) lastTick = Math.max(lastTick, note.tick + note.dur);
    const role = collected.notes.length === 0 ? null : roleFromTrackName(name);
    tracks.push({ name, role, notes: collected.notes.length });
    if (collected.notes.length === 0) continue;
    if (role === null) {
      gaps.push(`轨「${name}」对不上已知角色，音高仍算进能量和色彩，不把它当成 kick 或 808。`);
      analysisTracks.push({ role: "MELODY", notes: collected.notes });
    } else {
      analysisTracks.push({ role, notes: collected.notes });
    }
  }
  if (unmatched > 0) gaps.push("有的音没有对应的结束，时值按 1 tick 算。");

  const rawMarkers = midi.tracks.flatMap((track) =>
    track.events.filter((event) => event.kind === "marker").map((event) => (event.kind === "marker" ? event : null)),
  );
  const markerPoints = rawMarkers.flatMap((event) => (event ? [event] : []));
  for (const marker of markerPoints) lastTick = Math.max(lastTick, scaleTick(marker.tick, ppq));
  const totalBars = Math.max(1, Math.ceil(lastTick / barTicks));

  const sectionPoints = markerPoints
    .filter((event) => isSectionMarker(event.text))
    .map((event) => ({ text: event.text.trim(), bar: Math.min(totalBars - 1, Math.floor(scaleTick(event.tick, ppq) / barTicks)) }))
    .sort((left, right) => left.bar - right.bar);
  const sections = sectionPoints.map((point, index) => {
    const next = sectionPoints[index + 1];
    const end = next ? next.bar : totalBars;
    return { name: point.text, startBar: point.bar, bars: Math.max(0, end - point.bar) };
  });

  const markers: ImportedMarker[] = markerPoints.map((event) => ({
    tick: event.tick,
    bar: Math.floor(scaleTick(event.tick, ppq) / barTicks),
    text: event.text,
    section: isSectionMarker(event.text),
  }));

  return {
    bpm,
    tempoCount: tempos.length,
    ppq,
    beatsPerBar,
    timeSignature,
    tracks,
    markers,
    gaps,
    song: {
      keyRoot: options.keyRoot ?? 0,
      keyScale: options.keyScale ?? "major",
      beatsPerBar,
      totalBars,
      allowBorrowed: true,
      sections,
      tracks: analysisTracks,
    },
  };
}
