import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { EAR_MELODIC_SPACING_SECONDS } from "../../src/core/audio/ear.ts";

/**
 * 引擎在浏览器里跑，测试里用一个假的 AudioContext 顶替，
 * 记录每个振荡器「什么时候开始、什么频率」。
 *
 * 这样能直接断言：和弦题的所有音是不是真的同一时刻响（而不是琶音），
 * 旋律题的音是不是真的依次响。
 */

interface Started {
  when: number;
  frequency: number;
}

interface ParamCall {
  type: string;
  value: number;
  time: number;
  constant?: number;
}

interface FakeParam {
  value: number;
  /** 参数自动化调用的记录，用来断言「制音器落在哪一刻」。 */
  calls: ParamCall[];
  setValueAtTime: (value: number, time: number) => void;
  linearRampToValueAtTime: (value: number, time: number) => void;
  exponentialRampToValueAtTime: (value: number, time: number) => void;
  setTargetAtTime: (value: number, time: number, constant: number) => void;
  cancelScheduledValues: (time: number) => void;
}

function fakeParam(): FakeParam {
  const param: FakeParam = {
    value: 0,
    calls: [],
    setValueAtTime: (value, time) => {
      param.value = value;
      param.calls.push({ type: "setValueAtTime", value, time });
    },
    linearRampToValueAtTime: (value, time) => {
      param.value = value;
      param.calls.push({ type: "linearRampToValueAtTime", value, time });
    },
    exponentialRampToValueAtTime: (value, time) => {
      param.value = value;
      param.calls.push({ type: "exponentialRampToValueAtTime", value, time });
    },
    setTargetAtTime: (value, time, constant) => {
      param.value = value;
      param.calls.push({ type: "setTargetAtTime", value, time, constant });
    },
    cancelScheduledValues: () => {},
  };
  return param;
}

class FakeAudioContext {
  static instances: FakeAudioContext[] = [];
  currentTime = 0;
  state = "running";
  sampleRate = 44100;
  destination = {};
  started: Started[] = [];
  stopped: { when: number }[] = [];
  /** 所有创建过的增益节点。 */
  gains: FakeParam[] = [];

  constructor() {
    FakeAudioContext.instances.push(this);
  }

  createGain() {
    const gain = fakeParam();
    this.gains.push(gain);
    return { gain, connect: (node: unknown) => node };
  }

  createOscillator() {
    const context = this;
    const frequency = fakeParam();
    return {
      type: "sine",
      frequency,
      detune: fakeParam(),
      connect: (node: unknown) => node,
      start(when: number) {
        context.started.push({ when, frequency: frequency.value });
      },
      stop(when: number) {
        context.stopped.push({ when });
      },
      onended: null as null | (() => void),
    };
  }

  createBufferSource() {
    return {
      buffer: null as unknown,
      connect: (node: unknown) => node,
      start: () => {},
      stop: () => {},
      onended: null as null | (() => void),
    };
  }

  createBiquadFilter() {
    return {
      type: "lowpass",
      frequency: fakeParam(),
      Q: fakeParam(),
      connect: (node: unknown) => node,
    };
  }

  createWaveShaper() {
    return { curve: null as unknown, oversample: "none", connect: (node: unknown) => node };
  }

  createBuffer(_channels: number, length: number) {
    return { getChannelData: () => new Float32Array(length) };
  }

  async resume() {
    this.state = "running";
  }
}

const originalAudioContext = (globalThis as { AudioContext?: unknown }).AudioContext;

beforeEach(() => {
  FakeAudioContext.instances = [];
  (globalThis as { AudioContext?: unknown }).AudioContext = FakeAudioContext;
});

afterEach(() => {
  (globalThis as { AudioContext?: unknown }).AudioContext = originalAudioContext;
});

async function makeEngine() {
  const { createEngine } = await import("../../src/core/audio/engine.ts");
  const engine = createEngine();
  if (!engine) throw new Error("engine 应该是非空的");
  return { engine, context: FakeAudioContext.instances[0] as FakeAudioContext };
}

/** 按开始时刻分组：一个音 = 同一时刻起的那批振荡器。 */
function noteGroups(context: FakeAudioContext): Started[][] {
  const groups = new Map<number, Started[]>();
  for (const entry of context.started) {
    const list = groups.get(entry.when) ?? [];
    list.push(entry);
    groups.set(entry.when, list);
  }
  return [...groups.values()];
}

describe("playEarOption 的调度时刻", () => {
  it("和弦题的三个音同时响（不是琶音）", async () => {
    const { engine, context } = await makeEngine();
    engine.playEarOption([60, 64, 67]);
    const groups = noteGroups(context);
    // 同一时刻 = 一组，里面是 3 个音 × (基音 + 八度泛音) = 6 个振荡器。
    expect(groups).toHaveLength(1);
    expect(groups[0]).toHaveLength(6);
    expect(groups[0]!.map((entry) => Math.round(entry.frequency))).toEqual([
      262, 523, 330, 659, 392, 784,
    ]);
  });

  it("旋律题的两个音依次响，间隔等于设定的节奏", async () => {
    const { engine, context } = await makeEngine();
    engine.playEarOption([60, 64]);
    const groups = noteGroups(context);
    expect(groups).toHaveLength(2);
    expect(groups[0]).toHaveLength(2);
    expect(groups[1]![0]!.when - groups[0]![0]!.when).toBeCloseTo(EAR_MELODIC_SPACING_SECONDS, 6);
  });

  it("单音题只响一个音", async () => {
    const { engine, context } = await makeEngine();
    engine.playEarOption([60]);
    const groups = noteGroups(context);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toHaveLength(2);
  });

  it("干扰项 C F G 也要同时响（否则比的是琶音不是和弦）", async () => {
    const { engine, context } = await makeEngine();
    engine.playEarOption([60, 65, 67]);
    const groups = noteGroups(context);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toHaveLength(6);
  });

  it("节奏题里同一个音重复 N 次是 N 个事件", async () => {
    const { engine, context } = await makeEngine();
    engine.playEarOption([64, 64, 64]);
    const groups = noteGroups(context);
    expect(groups).toHaveLength(3);
    expect(groups.every((group) => group.length === 2)).toBe(true);
  });
});

describe("参考音走电钢、听辨走纯音", () => {
  it("playPitch 走电钢：起 4 条泛音", async () => {
    const { engine, context } = await makeEngine();
    engine.playPitch(60);
    // 电钢是加法合成：4 条泛音 = 4 个振荡器，同一时刻起。
    // 泛音按弦的不谐和略微拉高，所以比理论值高几个赫兹。
    expect(context.started).toHaveLength(4);
    expect(new Set(context.started.map((entry) => entry.when)).size).toBe(1);
    expect(context.started.map((entry) => Math.round(entry.frequency))).toEqual([262, 524, 786, 1049]);
  });

  it("playEarOption 走纯音：只有基音和八度泛音，没有高次泛音", async () => {
    const { engine, context } = await makeEngine();
    engine.playEarOption([60]);
    const frequencies = context.started.map((entry) => entry.frequency);
    expect(frequencies).toHaveLength(2);
    expect(frequencies[0]).toBeCloseTo(261.6256, 3);
    expect(frequencies[1]).toBeCloseTo(523.2512, 3);
  });
});

describe("延音跟住按住时长", () => {
  /** 电钢的 4 条泛音各自的增益节点：有起音斜坡的那些。 */
  function voiceGains(context: FakeAudioContext): FakeParam[] {
    return context.gains.filter((gain) =>
      gain.calls.some((call) => call.type === "linearRampToValueAtTime"),
    );
  }

  it("按下就起音，并且不预先安排停止时刻", async () => {
    const { engine, context } = await makeEngine();
    const id = engine.pressPitch(60);
    expect(id).toBeGreaterThan(0);
    expect(context.started).toHaveLength(4);
    // 按住不放：振荡器不会自己停，延音多长由手指决定。
    expect(context.stopped).toHaveLength(0);
  });

  it("松手后制音器落下，振荡器被停下", async () => {
    const { engine, context } = await makeEngine();
    const id = engine.pressPitch(60);
    context.currentTime = 2;
    engine.releasePitch(id);
    expect(context.stopped).toHaveLength(4);
    for (const stop of context.stopped) {
      expect(stop.when).toBeGreaterThanOrEqual(2);
    }
  });

  it("制音器落在松手的那一刻，不是按下后的固定时长", async () => {
    const { engine, context } = await makeEngine();
    const id = engine.pressPitch(60);
    context.currentTime = 2;
    engine.releasePitch(id);
    const dampers = voiceGains(context).flatMap((gain) =>
      gain.calls.filter((call) => call.type === "setTargetAtTime" && call.constant === 0.08),
    );
    expect(dampers).toHaveLength(4);
    for (const damper of dampers) {
      expect(damper.time).toBeCloseTo(2, 6);
    }
  });

  it("松得太快时制音器不会早于起音", async () => {
    const { engine, context } = await makeEngine();
    const id = engine.pressPitch(60);
    engine.releasePitch(id);
    const dampers = voiceGains(context).flatMap((gain) =>
      gain.calls.filter((call) => call.type === "setTargetAtTime" && call.constant === 0.08),
    );
    const startedAt = context.started[0]!.when;
    for (const damper of dampers) {
      expect(damper.time).toBeGreaterThanOrEqual(startedAt);
    }
  });

  it("松同一个音两次不会出错", async () => {
    const { engine, context } = await makeEngine();
    const id = engine.pressPitch(60);
    engine.releasePitch(id);
    engine.releasePitch(id);
    expect(context.stopped).toHaveLength(4);
  });
});
