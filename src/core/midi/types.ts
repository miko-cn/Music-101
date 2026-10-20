/** 每四分音符的 tick 数，M1 全局统一为 480。 */
export const PPQ = 480;

/**
 * 单一轨内的事件联合类型。
 * 只保留 M1 真正需要的事件，避免读入时产生无法表达的数据。
 */
export type MidiEvent =
  | { kind: "noteOn"; tick: number; pitch: number; velocity: number; channel: number }
  | { kind: "noteOff"; tick: number; pitch: number; velocity: number; channel: number }
  | { kind: "tempo"; tick: number; microsecondsPerBeat: number }
  | { kind: "marker"; tick: number; text: string }
  | { kind: "trackName"; tick: number; text: string }
  | { kind: "timeSignature"; tick: number; numerator: number; denominator: number };

export interface MidiTrack {
  /** 轨名，同时会写进轨首的 track name meta 事件。 */
  name: string;
  events: MidiEvent[];
}

export interface MidiFile {
  /** 0 = 单轨，1 = 多轨。 */
  format: 0 | 1;
  ppq: number;
  tracks: MidiTrack[];
}
