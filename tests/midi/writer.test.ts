import { describe, expect, it } from "vitest";
import { readMidiFile } from "../../src/core/midi/reader.ts";
import { encodeVariableLength, writeMidiFile } from "../../src/core/midi/writer.ts";
import type { MidiFile } from "../../src/core/midi/types.ts";

const demo: MidiFile = {
  format: 1,
  ppq: 480,
  tracks: [
    {
      name: "Music-101",
      events: [
        { kind: "trackName", tick: 0, text: "Music-101" },
        { kind: "tempo", tick: 0, microsecondsPerBeat: 400000 },
        { kind: "marker", tick: 1920, text: "Chorus" },
      ],
    },
    {
      name: "KICK",
      events: [
        { kind: "trackName", tick: 0, text: "KICK" },
        { kind: "noteOn", tick: 0, pitch: 36, velocity: 100, channel: 9 },
        { kind: "noteOff", tick: 120, pitch: 36, velocity: 64, channel: 9 },
      ],
    },
  ],
};

describe("encodeVariableLength", () => {
  it("编码 7 位分组", () => {
    expect(encodeVariableLength(0)).toEqual([0x00]);
    expect(encodeVariableLength(127)).toEqual([0x7f]);
    expect(encodeVariableLength(128)).toEqual([0x81, 0x00]);
    expect(encodeVariableLength(16383)).toEqual([0xff, 0x7f]);
  });
});

describe("writeMidiFile", () => {
  it("写出 MThd 头，格式、轨数、PPQ 正确", () => {
    const bytes = writeMidiFile(demo);
    expect(String.fromCharCode(...bytes.slice(0, 4))).toBe("MThd");
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    expect(view.getUint32(4)).toBe(6);
    expect(view.getUint16(8)).toBe(1);
    expect(view.getUint16(10)).toBe(2);
    expect(view.getUint16(12)).toBe(480);
  });

  it("每个轨块以 MTrk 开头并以 end-of-track 收尾", () => {
    const bytes = writeMidiFile(demo);
    const text = String.fromCharCode(...bytes);
    expect(text.indexOf("MTrk")).toBeGreaterThan(text.indexOf("MThd"));
    expect(text.endsWith("\x00\xff\x2f\x00")).toBe(true);
  });

  it("轨名与标记以 meta 事件写入", () => {
    const bytes = writeMidiFile(demo);
    const text = String.fromCharCode(...bytes);
    expect(text).toContain("KICK");
    expect(text).toContain("Chorus");
    expect(text).toContain("\xff\x03"); // track name
    expect(text).toContain("\xff\x06"); // marker
  });

  it("marker 里的降号写成 ASCII b，文件里不留 UTF-8 的 ♭", () => {
    const bytes = writeMidiFile({
      format: 0,
      ppq: 480,
      tracks: [
        {
          name: "M",
          events: [
            { kind: "trackName", tick: 0, text: "M" },
            { kind: "marker", tick: 0, text: "D (♭VI)" },
          ],
        },
      ],
    });
    expect(bytes.includes(0xe2)).toBe(false);
    expect(bytes.includes(0x99)).toBe(false);
    const marker = readMidiFile(bytes).tracks[0]?.events.find((event) => event.kind === "marker");
    expect(marker).toEqual({ kind: "marker", tick: 0, text: "D (bVI)" });
  });

  it("拒绝负数 VLQ", () => {
    expect(() => encodeVariableLength(-1)).toThrow();
  });
});
