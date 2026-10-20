import type { MidiEvent, MidiFile, MidiTrack } from "./types.ts";

const META_TRACK_NAME = 0x03;
const META_MARKER = 0x06;
const META_TEMPO = 0x51;
const META_END_OF_TRACK = 0x2f;

const decoder = new TextDecoder();

function fail(message: string): never {
  throw new Error(`不是合法的 MIDI 文件：${message}`);
}

/** 读取 VLQ（可变长度数量），返回数值与新的读取位置。 */
function readVariableLength(bytes: Uint8Array, start: number, end: number): [number, number] {
  let value = 0;
  let position = start;
  for (let count = 0; count < 4; count += 1) {
    if (position >= end) {
      fail("VLQ 长度越界");
    }
    const byte = bytes[position];
    position += 1;
    value = (value << 7) | (byte & 0x7f);
    if ((byte & 0x80) === 0) {
      return [value, position];
    }
  }
  return fail("VLQ 超过 4 字节");
}

function readTrack(bytes: Uint8Array, start: number, end: number): MidiTrack {
  const events: MidiEvent[] = [];
  let position = start;
  let tick = 0;
  let runningStatus = 0;
  let name = "";

  while (position < end) {
    const [delta, afterDelta] = readVariableLength(bytes, position, end);
    position = afterDelta;
    tick += delta;

    if (position >= end) {
      fail("事件缺少状态字节");
    }
    let status = bytes[position];
    if (status < 0x80) {
      // 运行状态：复用上一个状态字节。
      if (runningStatus === 0) {
        fail("出现没有状态字节的数据");
      }
      status = runningStatus;
    } else {
      position += 1;
      if (status < 0xf0) {
        runningStatus = status;
      }
    }

    if (status === 0xff) {
      if (position >= end) {
        fail("meta 事件缺少类型字节");
      }
      const metaType = bytes[position];
      position += 1;
      const [length, afterLength] = readVariableLength(bytes, position, end);
      position = afterLength;
      if (position + length > end) {
        fail("meta 事件数据越界");
      }
      const data = bytes.subarray(position, position + length);
      position += length;

      if (metaType === META_TEMPO) {
        if (data.length < 3) {
          fail("tempo 事件长度不足 3 字节");
        }
        events.push({
          kind: "tempo",
          tick,
          microsecondsPerBeat: (data[0] << 16) | (data[1] << 8) | data[2],
        });
      } else if (metaType === META_TRACK_NAME) {
        const text = decoder.decode(data);
        // 轨名以轨首的 track name meta 为准：若出现多个，取第一个。
        if (name === "") {
          name = text;
        }
        events.push({ kind: "trackName", tick, text });
      } else if (metaType === META_MARKER) {
        events.push({ kind: "marker", tick, text: decoder.decode(data) });
      } else if (metaType === META_END_OF_TRACK) {
        break;
      }
      // 其他 meta 事件（文本、拍号、乐器名等）M1 不需要，直接忽略。
    } else if (status === 0xf0 || status === 0xf7) {
      const [length, afterLength] = readVariableLength(bytes, position, end);
      position = afterLength;
      if (position + length > end) {
        fail("sysex 事件数据越界");
      }
      position += length;
    } else {
      const messageType = status & 0xf0;
      const channel = status & 0x0f;
      if (messageType === 0x90 || messageType === 0x80) {
        if (position + 2 > end) {
          fail("音符事件数据越界");
        }
        const pitch = bytes[position];
        const velocity = bytes[position + 1];
        position += 2;
        // 力度为 0 的 noteOn 在 SMF 里等同于 note off。
        if (messageType === 0x90 && velocity > 0) {
          events.push({ kind: "noteOn", tick, pitch, velocity, channel });
        } else {
          events.push({ kind: "noteOff", tick, pitch, velocity, channel });
        }
      } else if (messageType === 0xc0 || messageType === 0xd0) {
        position += 1;
      } else {
        position += 2;
      }
    }
  }

  return { name, events };
}


export function readMidiFile(bytes: Uint8Array): MidiFile {
  if (bytes.length < 14) {
    fail("数据长度不足一个 MThd 头");
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let position = 0;

  const readAscii = (count: number): string => {
    if (position + count > bytes.length) {
      fail("块标识越界");
    }
    let text = "";
    for (let index = 0; index < count; index += 1) {
      text += String.fromCharCode(bytes[position]);
      position += 1;
    }
    return text;
  };

  if (readAscii(4) !== "MThd") {
    fail("缺少 MThd 头");
  }
  const headerLength = view.getUint32(position);
  position += 4;
  if (headerLength < 6) {
    fail("MThd 头长度非法");
  }
  const format = view.getUint16(position);
  position += 2;
  const trackCount = view.getUint16(position);
  position += 2;
  const ppq = view.getUint16(position);
  position += 2;
  position += headerLength - 6;

  const tracks: MidiTrack[] = [];
  let parsed = 0;
  while (position < bytes.length && parsed < trackCount) {
    const chunkId = readAscii(4);
    const chunkLength = view.getUint32(position);
    position += 4;
    const chunkEnd = position + chunkLength;
    if (chunkEnd > bytes.length) {
      fail(`${chunkId} 块长度越界`);
    }
    if (chunkId === "MTrk") {
      tracks.push(readTrack(bytes, position, chunkEnd));
      parsed += 1;
    }
    position = chunkEnd;
  }

  if (tracks.length !== trackCount) {
    fail(`轨数不足：声明 ${trackCount} 轨，实际读到 ${tracks.length} 轨`);
  }

  return { format: format === 0 ? 0 : 1, ppq, tracks };
}
