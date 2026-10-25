import type { MidiEvent, MidiFile, MidiTrack } from "./types.ts";

const META_TRACK_NAME = 0x03;
/**
 * 0x06 在 SMF 里是 Marker。
 * MMA 的 Chord Name 与 Marker 共用这一号段，写出端若同时写和弦 meta 事件，
 * 读入端无法区分，会把和弦名误当成段落标记。
 * 因此 M1 只写 Marker，不写和弦 meta 事件。
 */
const META_MARKER = 0x06;
const META_TEMPO = 0x51;
const META_TIME_SIGNATURE = 0x58;
const META_END_OF_TRACK = 0x2f;

/**
 * 同一 tick 内的事件顺序。
 * noteOff 必须排在 noteOn 之前：SMF 按字节顺序播放，若同 tick 先出现 noteOn，
 * 前一个同音高的音会被立刻切断，表现为音符被“吃掉”。
 * tempo / trackName / marker 之间没有先后依赖，给同样的序值即可保持原有顺序。
 */
const EVENT_ORDER: Record<MidiEvent["kind"], number> = {
  tempo: 0,
  trackName: 0,
  marker: 0,
  timeSignature: 0,
  noteOff: 1,
  noteOn: 2,
};

/** 把非负整数编码成 SMF 的可变长度数量（VLQ）：每字节 7 位，高位表示还有后续字节。 */
export function encodeVariableLength(value: number): number[] {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`VLQ 需要非负整数，收到 ${value}`);
  }
  const out = [value & 0x7f];
  let rest = Math.floor(value / 128);
  while (rest > 0) {
    out.unshift((rest & 0x7f) | 0x80);
    rest = Math.floor(rest / 128);
  }
  return out;
}

function ascii(text: string): number[] {
  return Array.from(text, (char) => char.charCodeAt(0));
}

function u16(value: number): number[] {
  return [(value >>> 8) & 0xff, value & 0xff];
}

function u32(value: number): number[] {
  return [(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff];
}

/** 文本统一用 UTF-8 编码，长度按字节数算（meta 长度也是字节数）。 */
/**
 * Cubase 13 在中文 Windows 上按系统 ANSI（GBK）读 marker，不按 UTF-8。
 * ♭ 的 UTF-8 是 E2 99 AD，会和后面的字母拼成汉字，例如 ♭VI 显示成「鈾璙I」。
 * 标记文本改成 ASCII b，界面上的罗马数字仍然用 ♭。
 */
export function markerTextForHost(text: string): string {
  return text.replaceAll("♭", "b");
}

function encodeText(text: string): number[] {
  const bytes = Array.from(new TextEncoder().encode(text));
  return [...encodeVariableLength(bytes.length), ...bytes];
}

function sortEvents(events: readonly MidiEvent[]): MidiEvent[] {
  // Array.prototype.sort 自 ES2019 起是稳定排序，序值相同的事件保持原有先后，
  // 这样“写出→读入”才能逐字段相等。
  return [...events].sort((a, b) =>
    a.tick !== b.tick ? a.tick - b.tick : EVENT_ORDER[a.kind] - EVENT_ORDER[b.kind],
  );
}

/**
 * 写出单条轨。
 * 轨名写两处：模型里的 MidiTrack.name 字段 + 轨首的 track name meta 事件。
 * 字节流只包含事件列表本身——轨名由列表里的 trackName 事件承载，
 * 读入端再以 track name meta 为准还原 MidiTrack.name；
 * 若在此额外补一条 trackName 事件，读回后的事件列表会比原来多一条，
 * 破坏“写出→读入逐字段相等”的往返约束。
 */
function encodeTrack(track: MidiTrack): number[] {
  const body: number[] = [];
  let lastTick = 0;
  for (const event of sortEvents(track.events)) {
    const delta = event.tick - lastTick;
    lastTick = event.tick;
    body.push(...encodeVariableLength(delta));
    switch (event.kind) {
      case "tempo":
        body.push(
          0xff,
          META_TEMPO,
          0x03,
          (event.microsecondsPerBeat >>> 16) & 0xff,
          (event.microsecondsPerBeat >>> 8) & 0xff,
          event.microsecondsPerBeat & 0xff,
        );
        break;
      case "trackName":
        body.push(0xff, META_TRACK_NAME, ...encodeText(event.text));
        break;
      case "marker":
        body.push(0xff, META_MARKER, ...encodeText(markerTextForHost(event.text)));
        break;
      case "timeSignature": {
        const denominator = Math.max(1, event.denominator);
        const log = Math.round(Math.log2(denominator));
        body.push(0xff, META_TIME_SIGNATURE, 0x04, event.numerator & 0xff, log & 0xff, 24, 8);
        break;
      }
      case "noteOn":
        if (event.velocity === 0) {
          // 力度 0 的 noteOn 在 SMF 语义上就是 note off，直接写成 0x80 状态字节。
          body.push(0x80 | (event.channel & 0x0f), event.pitch & 0x7f, 0);
        } else {
          body.push(0x90 | (event.channel & 0x0f), event.pitch & 0x7f, event.velocity & 0x7f);
        }
        break;
      case "noteOff":
        body.push(0x80 | (event.channel & 0x0f), event.pitch & 0x7f, event.velocity & 0x7f);
        break;
    }
  }
  // 每条轨必须以 end of track meta 收尾，否则部分软件会拒绝播放该轨。
  body.push(0x00, 0xff, META_END_OF_TRACK, 0x00);
  return body;
}

/** 把领域模型序列化成标准 MIDI 文件（SMF format 0/1）的字节流。 */
export function writeMidiFile(file: MidiFile): Uint8Array {
  const parts: number[] = [
    ...ascii("MThd"),
    ...u32(6),
    ...u16(file.format),
    ...u16(file.tracks.length),
    ...u16(file.ppq),
  ];
  for (const track of file.tracks) {
    const body = encodeTrack(track);
    parts.push(...ascii("MTrk"), ...u32(body.length), ...body);
  }
  return new Uint8Array(parts);
}
