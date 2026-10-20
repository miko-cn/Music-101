import { describe, expect, it } from "vitest";
import { readMidiFile } from "../../src/core/midi/reader.ts";
import { writeMidiFile } from "../../src/core/midi/writer.ts";
import type { MidiFile } from "../../src/core/midi/types.ts";

describe("readMidiFile", () => {
  it("读出 tempo 事件", () => {
    const file: MidiFile = {
      format: 1,
      ppq: 480,
      tracks: [
        {
          name: "Conductor",
          events: [
            { kind: "trackName", tick: 0, text: "Conductor" },
            { kind: "tempo", tick: 0, microsecondsPerBeat: 500000 },
          ],
        },
      ],
    };
    const back = readMidiFile(writeMidiFile(file));
    const tempo = back.tracks[0].events.find((event) => event.kind === "tempo");
    expect(tempo).toEqual({ kind: "tempo", tick: 0, microsecondsPerBeat: 500000 });
  });

  it("同一 tick 上 noteOff 排在 noteOn 之前", () => {
    const file: MidiFile = {
      format: 1,
      ppq: 480,
      tracks: [
        {
          name: "Lead",
          events: [
            { kind: "noteOn", tick: 0, pitch: 60, velocity: 100, channel: 0 },
            { kind: "noteOff", tick: 480, pitch: 60, velocity: 64, channel: 0 },
            { kind: "noteOn", tick: 480, pitch: 62, velocity: 100, channel: 0 },
            { kind: "noteOff", tick: 960, pitch: 62, velocity: 64, channel: 0 },
          ],
        },
      ],
    };
    const back = readMidiFile(writeMidiFile(file));
    const kinds = back.tracks[0].events.map((event) => event.kind);
    expect(kinds).toEqual(["noteOn", "noteOff", "noteOn", "noteOff"]);
    const ticks = back.tracks[0].events.map((event) => event.tick);
    expect(ticks).toEqual([0, 480, 480, 960]);
  });

  it("读出标记文本", () => {
    const file: MidiFile = {
      format: 1,
      ppq: 480,
      tracks: [
        {
          name: "Conductor",
          events: [
            { kind: "trackName", tick: 0, text: "Conductor" },
            { kind: "marker", tick: 960, text: "PreChorus" },
          ],
        },
      ],
    };
    const back = readMidiFile(writeMidiFile(file));
    const marker = back.tracks[0].events.find((event) => event.kind === "marker");
    expect(marker).toEqual({ kind: "marker", tick: 960, text: "PreChorus" });
  });
});
