/** 一拍四个十六分音符。120 BPM 时每格 0.125 秒。 */
export function stepSeconds(bpm: number, beatsPerBar = 4, stepsPerBar = 16): number {
  if (!Number.isFinite(bpm) || bpm <= 0) throw new Error(`BPM 必须是正数: ${bpm}`);
  const stepsPerBeat = stepsPerBar / beatsPerBar;
  return 60 / bpm / stepsPerBeat;
}

export interface DueStep {
  index: number;
  time: number;
}

/**
 * 从 nextIndex 起，把起点落在 [now, now + horizon) 里的格子取出来。
 * 规格里的调度是 25ms 定时器配 200ms 预排，这里只算该排哪些，不定时器。
 */
export function takeDue(
  nextIndex: number,
  nextTime: number,
  now: number,
  horizon: number,
  stepSecondsValue: number,
  total: number,
): { events: DueStep[]; nextIndex: number; nextTime: number } {
  const events: DueStep[] = [];
  let index = nextIndex;
  let time = nextTime;
  const limit = now + horizon;
  while (index < total && time < limit) {
    if (time >= now) events.push({ index, time });
    index += 1;
    time += stepSecondsValue;
  }
  return { events, nextIndex: index, nextTime: time };
}
