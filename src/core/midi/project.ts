import type { PitchClass } from "../theory/pitch.ts";
import type { ScaleId } from "../theory/scale.ts";
import { PPQ, type MidiEvent, type MidiFile, type MidiTrack } from "./types.ts";

export type TrackRole =
  | "KICK"
  | "SNARE"
  | "CLAP"
  | "HAT"
  | "808"
  | "BASS"
  | "SUPERSAW"
  | "CHOP"
  | "ARP"
  | "FX";

export const DRUM_ROLES = ["KICK", "SNARE", "CLAP", "HAT"] as const;
export type DrumRole = (typeof DRUM_ROLES)[number];

/** General MIDI 打击乐音高。 */
export const GM_DRUM_PITCH: Record<DrumRole, number> = {
  KICK: 36,
  SNARE: 38,
  CLAP: 39,
  HAT: 42,
};

export interface Section {
  name: string;
  startBar: number;
  bars: number;
}

export interface SkeletonNote {
  tick: number;
  dur: number;
  pitch: number;
  vel: number;
}

export interface SkeletonTrack {
  role: TrackRole;
  channel: number;
  notes: SkeletonNote[];
}

export interface SkeletonChord {
  tick: number;
  /** 和弦音的 MIDI 音高，由调用方算好（core/midi 不依赖 core/theory） */
  pitches: number[];
  /** 标记与轨面上显示的和弦名，例如 "F#m" */
  text: string;
}

export interface SongSkeleton {
  bpm: number;
  keyRoot: PitchClass;
  keyScale: ScaleId;
  beatsPerBar: number;
  totalBars: number;
  sections: Section[];
  tracks: SkeletonTrack[];
  chords: SkeletonChord[];
}

export const CHORD_TRACK_NAME = "CHORDS";
export const CHORD_TRACK_CHANNEL = 3;

export function barToTick(bar: number, beatsPerBar: number, ppq: number = PPQ): number {
  return bar * beatsPerBar * ppq;
}

export function skeletonToMidi(skeleton: SongSkeleton): MidiFile {
  const conductor: MidiTrack = {
    name: "Music-101",
    events: [
      { kind: "trackName", tick: 0, text: "Music-101" },
      {
        kind: "tempo",
        tick: 0,
        microsecondsPerBeat: Math.round(60_000_000 / skeleton.bpm),
      },
    ],
  };

  for (const section of skeleton.sections) {
    conductor.events.push({
      kind: "marker",
      tick: barToTick(section.startBar, skeleton.beatsPerBar),
      text: section.name,
    });
  }

  for (const chord of skeleton.chords) {
    conductor.events.push({ kind: "marker", tick: chord.tick, text: chord.text });
  }

  const tracks: MidiTrack[] = [conductor];

  for (const skeletonTrack of skeleton.tracks) {
    const events: MidiEvent[] = [
      { kind: "trackName", tick: 0, text: skeletonTrack.role },
    ];
    for (const note of skeletonTrack.notes) {
      events.push({
        kind: "noteOn",
        tick: note.tick,
        pitch: note.pitch,
        velocity: note.vel,
        channel: skeletonTrack.channel,
      });
      events.push({
        kind: "noteOff",
        tick: note.tick + note.dur,
        pitch: note.pitch,
        velocity: 64,
        channel: skeletonTrack.channel,
      });
    }
    tracks.push({ name: skeletonTrack.role, events });
  }

  if (skeleton.chords.length > 0) {
    const chordEvents: MidiEvent[] = [
      { kind: "trackName", tick: 0, text: CHORD_TRACK_NAME },
    ];
    const barTicks = skeleton.beatsPerBar * PPQ;
    for (const chord of skeleton.chords) {
      for (const pitch of chord.pitches) {
        chordEvents.push({
          kind: "noteOn",
          tick: chord.tick,
          pitch,
          velocity: 90,
          channel: CHORD_TRACK_CHANNEL,
        });
        chordEvents.push({
          kind: "noteOff",
          tick: chord.tick + barTicks,
          pitch,
          velocity: 64,
          channel: CHORD_TRACK_CHANNEL,
        });
      }
    }
    tracks.push({ name: CHORD_TRACK_NAME, events: chordEvents });
  }

  return { format: 1, ppq: PPQ, tracks };
}
