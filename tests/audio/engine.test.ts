import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { EAR_MELODIC_SPACING_SECONDS } from "../../src/core/audio/ear.ts";
import type { MusicEngine } from "../../src/core/audio/engine.ts";

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

interface FakeGainNode {
  gain: FakeParam;
  connect: (target: unknown) => unknown;
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
  /** createConvolver 被调用的次数：混响只该建一次。 */
  convolvers = 0;
  /** 增益节点本身（gains 只存它们的 gain 参数），顺序与 gains 一致。 */
  gainNodes: FakeGainNode[] = [];
  convolverNodes: object[] = [];
  /** 增益节点和混响节点的连线。其它节点不记，用不上。 */
  edges: { from: object; to: unknown }[] = [];

  constructor() {
    FakeAudioContext.instances.push(this);
  }

  createGain() {
    const gain = fakeParam();
    this.gains.push(gain);
    const node: FakeGainNode = {
      gain,
      connect: (target: unknown) => {
        this.edges.push({ from: node, to: target });
        return target;
      },
    };
    this.gainNodes.push(node);
    return node;
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

  createConvolver() {
    this.convolvers += 1;
    const node = {
      buffer: null as unknown,
      connect: (target: unknown) => {
        this.edges.push({ from: node, to: target });
        return target;
      },
    };
    this.convolverNodes.push(node);
    return node;
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

describe("反馈音总线", () => {
  /**
   * 播一次反馈音，再顺着连线认出总线的各个节点：
   * 混响是唯一的 convolver；连进混响的是入口，混响连到湿声，湿声连到 sfxOut。
   * master 是引擎构造时第一个建的增益节点。
   */
  function sfxGraph(engine: MusicEngine, context: FakeAudioContext) {
    engine.playSfx("correct");
    const target = (from: unknown) => context.edges.find((edge) => edge.from === from)?.to;
    const reverb = context.convolverNodes[0];
    const bus = context.edges.find((edge) => edge.to === reverb)?.from;
    const wet = target(reverb) as FakeGainNode | undefined;
    const out = target(wet) as FakeGainNode | undefined;
    const master = context.gainNodes[0];
    if (!reverb || !bus || !wet || !out || !master) throw new Error("playSfx 应该建出完整的总线");
    return { bus, reverb, wet, out, master };
  }

  it("总线懒创建：构造时不建，之后只建一次，混响也只建一次", async () => {
    const { engine, context } = await makeEngine();
    expect(context.convolvers).toBe(0);
    const base = context.gains.length;
    engine.playSfx("correct");
    const first = context.gains.length - base;
    engine.playSfx("correct");
    const second = context.gains.length - base - first;
    expect(context.convolvers).toBe(1);
    // 第一次比第二次多出的正好是入口、sfxOut、湿声三个节点；之后只建各音自己的包络。
    expect(first - second).toBe(3);
  });

  it("湿声回到 sfxOut，不回入口；sfxOut 接 master", async () => {
    const { engine, context } = await makeEngine();
    const { bus, reverb, wet, out, master } = sfxGraph(engine, context);
    const backToBus = context.edges.filter((edge) => (edge.from === wet || edge.from === reverb) && edge.to === bus);
    expect(backToBus).toHaveLength(0);
    expect(context.edges.filter((edge) => edge.from === wet).map((edge) => edge.to)).toEqual([out]);
    expect(context.edges.filter((edge) => edge.from === out).map((edge) => edge.to)).toEqual([master]);
  });

  it("setSfxVolume(0) 之后 sfxOut 增益为 0；总线还没建时先记住音量", async () => {
    const { engine, context } = await makeEngine();
    engine.setSfxVolume(0);
    const { out } = sfxGraph(engine, context);
    expect(out.gain.value).toBe(0);
    engine.setSfxVolume(1);
    expect(out.gain.value).toBeCloseTo(0.7);
  });

  it("音量变化作用在已有的 sfxOut 上，并且是平滑过渡而不是跳值", async () => {
    const { engine, context } = await makeEngine();
    const { out } = sfxGraph(engine, context);
    expect(out.gain.value).toBeCloseTo(0.7);
    engine.setSfxVolume(0.5);
    expect(out.gain.value).toBeCloseTo(0.35);
    expect(out.gain.calls.at(-1)?.type).toBe("setTargetAtTime");
  });

  it("越界和非有限的音量被夹住", async () => {
    const { engine, context } = await makeEngine();
    const { out } = sfxGraph(engine, context);
    engine.setSfxVolume(2);
    expect(out.gain.value).toBeCloseTo(0.7);
    engine.setSfxVolume(Number.NaN);
    expect(out.gain.value).toBe(0);
  });

  it("只管反馈音：静音后 master 不变，听辨题照样出声", async () => {
    const { engine, context } = await makeEngine();
    sfxGraph(engine, context);
    engine.setSfxVolume(0);
    expect(context.gains[0]!.value).toBeCloseTo(0.8);
    const startedBefore = context.started.length;
    engine.playEarOption([60]);
    expect(context.started.length - startedBefore).toBe(2);
  });
});
