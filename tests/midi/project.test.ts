import { describe, expect, it } from "vitest";
import { barToTick, skeletonToMidi } from "../../src/core/midi/project.ts";
import { PPQ } from "../../src/core/midi/types.ts";
import type { SongSkeleton } from "../../src/core/midi/project.ts";

const skeleton: SongSkeleton = {
  bpm: 150,
  keyRoot: 6,
  keyScale: "naturalMinor",
  beatsPerBar: 4,
  totalBars: 4,
  sections: [
    { name: "Intro", startBar: 0, bars: 1 },
    { name: "Chorus", startBar: 1, bars: 2 },
  ],
  tracks: [
    {
      role: "KICK",
      channel: 9,
      notes: [{ tick: 0, dur: 120, pitch: 36, vel: 100 }],
    },
  ],
  chords: [{ tick: 0, pitches: [54, 57, 61], text: "F#m" }],
};

describe("barToTick", () => {
  it("小节换算为 tick", () => {
    expect(barToTick(0, 4)).toBe(0);
    expect(barToTick(1, 4)).toBe(4 * PPQ);
    expect(barToTick(3, 4)).toBe(3 * 4 * PPQ);
  });
});

describe("skeletonToMidi", () => {
  it("生成导轨 + 各乐器轨 + 和弦轨", () => {
    const midi = skeletonToMidi(skeleton);
    expect(midi.ppq).toBe(PPQ);
    expect(midi.tracks.map((track) => track.name)).toEqual([
      "Music-101",
      "KICK",
      "CHORDS",
    ]);
  });

  it("150 BPM 对应 400000 微秒每拍", () => {
    const midi = skeletonToMidi(skeleton);
    const tempo = midi.tracks[0].events.find((event) => event.kind === "tempo");
    expect(tempo).toEqual({ kind: "tempo", tick: 0, microsecondsPerBeat: 400000 });
  });

  it("段落标记落在正确 tick", () => {
    const midi = skeletonToMidi(skeleton);
    const markers = midi.tracks[0].events.filter(
      (event) => event.kind === "marker" && (event.text === "Intro" || event.text === "Chorus"),
    );
    expect(markers).toEqual([
      { kind: "marker", tick: 0, text: "Intro" },
      { kind: "marker", tick: 4 * PPQ, text: "Chorus" },
    ]);
  });

  it("每个和弦也在导轨上留一个同名标记", () => {
    const midi = skeletonToMidi(skeleton);
    const chordMarker = midi.tracks[0].events.find(
      (event) => event.kind === "marker" && event.text === "F#m",
    );
    expect(chordMarker).toEqual({ kind: "marker", tick: 0, text: "F#m" });
  });

  it("每个音符展开为 noteOn + noteOff", () => {
    const midi = skeletonToMidi(skeleton);
    const kick = midi.tracks[1].events.filter(
      (event) => event.kind === "noteOn" || event.kind === "noteOff",
    );
    expect(kick).toEqual([
      { kind: "noteOn", tick: 0, pitch: 36, velocity: 100, channel: 9 },
      { kind: "noteOff", tick: 120, pitch: 36, velocity: 64, channel: 9 },
    ]);
  });

  it("和弦轨写出三和弦音，音长一小节", () => {
    const midi = skeletonToMidi(skeleton);
    const notes = midi.tracks[2].events.filter((event) => event.kind === "noteOn");
    expect(notes).toEqual([
      { kind: "noteOn", tick: 0, pitch: 54, velocity: 90, channel: 3 },
      { kind: "noteOn", tick: 0, pitch: 57, velocity: 90, channel: 3 },
      { kind: "noteOn", tick: 0, pitch: 61, velocity: 90, channel: 3 },
    ]);
    const offs = midi.tracks[2].events.filter((event) => event.kind === "noteOff");
    expect(offs[0]?.tick).toBe(4 * PPQ);
  });

  it("omitMarker 的延续小节只铺和弦音，不重复导轨标记", () => {
    const midi = skeletonToMidi({
      ...skeleton,
      chords: [
        { tick: 0, pitches: [54, 57, 61], text: "F#m" },
        { tick: 4 * PPQ, pitches: [54, 57, 61], text: "F#m", omitMarker: true },
      ],
    });
    const chordMarkers = midi.tracks[0].events.filter(
      (event) => event.kind === "marker" && event.text === "F#m",
    );
    expect(chordMarkers).toEqual([{ kind: "marker", tick: 0, text: "F#m" }]);
    const noteOns = midi.tracks[2].events.filter((event) => event.kind === "noteOn");
    expect(noteOns.map((event) => event.tick)).toEqual([0, 0, 0, 4 * PPQ, 4 * PPQ, 4 * PPQ]);
  });
});
