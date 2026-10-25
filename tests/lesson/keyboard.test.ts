import { describe, expect, it } from "vitest";
import {
  attachComputerKeyboard,
  createComputerKeyboardService,
  createKeyboardController,
  isTypingTarget,
  type ComputerKeyboardListener,
  type KeyboardEngine,
  type KeyboardEventTarget,
} from "../../src/core/lesson/keyboard.ts";
import { noteNameToMidi } from "../../src/core/theory/pitch.ts";
import type { PitchClass } from "../../src/core/theory/pitch.ts";

function fakeEngine() {
  const pressed: number[] = [];
  const released: number[] = [];
  let nextId = 1;
  const engine: KeyboardEngine = {
    async resume() {
      // 浏览器里是唤醒 AudioContext，测试里什么都不用做。
    },
    pressPitch(midi) {
      pressed.push(midi);
      const id = nextId;
      nextId += 1;
      return id;
    },
    releasePitch(voiceId) {
      released.push(voiceId);
    },
  };
  return { engine, pressed, released };
}

function fakeHost(engine: KeyboardEngine | null) {
  const host = {
    octave: 4,
    pressed: [] as { pitch: PitchClass; midi: number }[],
    released: [] as { pitch: PitchClass; midi: number }[],
    octaves: [] as number[],
    getOctave: () => host.octave,
    getEngine: () => engine,
    onPress: (pitch: PitchClass, midi: number) => {
      host.pressed.push({ pitch, midi });
    },
    onRelease: (pitch: PitchClass, midi: number) => {
      host.released.push({ pitch, midi });
    },
    onOctave: (octave: number) => {
      host.octaves.push(octave);
      host.octave = octave;
    },
  };
  return host;
}

function fakeTarget() {
  const listeners = new Map<string, ((event: Event) => void)[]>();
  const target: KeyboardEventTarget = {
    addEventListener(type, listener) {
      const list = listeners.get(type) ?? [];
      list.push(listener);
      listeners.set(type, list);
    },
    removeEventListener(type, listener) {
      listeners.set(type, (listeners.get(type) ?? []).filter((item) => item !== listener));
    },
  };
  return {
    target,
    fire(type: string, event: unknown) {
      for (const listener of listeners.get(type) ?? []) listener(event as Event);
    },
    count(type: string) {
      return (listeners.get(type) ?? []).length;
    },
  };
}

function fakeListener() {
  const listener = {
    pressed: [] as { pitch: PitchClass; midi: number }[],
    released: [] as { pitch: PitchClass; midi: number }[],
    octaves: [] as number[],
    onPress(pitch: PitchClass, midi: number) {
      listener.pressed.push({ pitch, midi });
    },
    onRelease(pitch: PitchClass, midi: number) {
      listener.released.push({ pitch, midi });
    },
    onOctave(octave: number) {
      listener.octaves.push(octave);
    },
  };
  return listener;
}

describe("电脑键接声音", () => {
  it("按下起音、松手制音——延音跟住按住时长", () => {
    const { engine, pressed, released } = fakeEngine();
    const host = fakeHost(engine);
    const controller = createKeyboardController(() => host);

    controller.keyDown({ key: "a" });
    expect(pressed).toEqual([noteNameToMidi("C4")]);
    expect(controller.soundingCount()).toBe(1);

    controller.keyUp({ key: "a" });
    // 松手收的是按下时那把琴键的句柄，不是另起一个新音。
    expect(released).toEqual([1]);
    expect(controller.soundingCount()).toBe(0);
  });

  it("松手点亮灭的是当初按下的那把琴键", () => {
    const { engine } = fakeEngine();
    const host = fakeHost(engine);
    const controller = createKeyboardController(() => host);

    controller.keyDown({ key: "a" });
    expect(host.pressed).toEqual([{ pitch: 0, midi: noteNameToMidi("C4") }]);
    controller.keyUp({ key: "a" });
    expect(host.released).toEqual([{ pitch: 0, midi: noteNameToMidi("C4") }]);
  });

  it("长按的自动重复不重新起音", () => {
    const { engine, pressed } = fakeEngine();
    const host = fakeHost(engine);
    const controller = createKeyboardController(() => host);

    controller.keyDown({ key: "a" });
    controller.keyDown({ key: "a", repeat: true });
    controller.keyDown({ key: "a", repeat: true });
    expect(pressed).toHaveLength(1);
    expect(controller.soundingCount()).toBe(1);
  });

  it("焦点在输入框里时不抢键盘", () => {
    const { engine, pressed } = fakeEngine();
    const host = fakeHost(engine);
    const controller = createKeyboardController(() => host);

    controller.keyDown({ key: "a", target: { closest: () => ({}) } });
    expect(pressed).toEqual([]);
    expect(host.pressed).toEqual([]);
  });

  it("Z / X 换八度，之后弹出来的是新八度", () => {
    const { engine, pressed } = fakeEngine();
    const host = fakeHost(engine);
    const controller = createKeyboardController(() => host);

    controller.keyDown({ key: "x" });
    expect(host.octaves).toEqual([5]);
    controller.keyDown({ key: "a" });
    expect(pressed).toEqual([noteNameToMidi("C5")]);
  });

  it("按着音换八度之后松手，仍然收得掉", () => {
    const { engine, released } = fakeEngine();
    const host = fakeHost(engine);
    const controller = createKeyboardController(() => host);

    controller.keyDown({ key: "a" });
    host.octave = 5;
    controller.keyUp({ key: "a" });
    expect(released).toEqual([1]);
    expect(controller.soundingCount()).toBe(0);
  });

  it("窗口失焦把还响着的音全收掉，琴键也熄了", () => {
    const { engine, released } = fakeEngine();
    const host = fakeHost(engine);
    const controller = createKeyboardController(() => host);

    controller.keyDown({ key: "a" });
    controller.keyDown({ key: "d" });
    expect(controller.soundingCount()).toBe(2);

    controller.blur();
    expect(released.sort()).toEqual([1, 2]);
    expect(host.released.map((item) => item.pitch).sort()).toEqual([0, 4]);
    expect(controller.soundingCount()).toBe(0);
  });

  it("离开这一页时收声音，但不再动界面", () => {
    const { engine, released } = fakeEngine();
    const host = fakeHost(engine);
    const controller = createKeyboardController(() => host);

    controller.keyDown({ key: "a" });
    controller.dispose();
    expect(released).toEqual([1]);
    expect(host.released).toEqual([]);
    expect(controller.soundingCount()).toBe(0);
  });

  it("浏览器里没有声音时，界面照样能选中音高", () => {
    const host = fakeHost(null);
    const controller = createKeyboardController(() => host);

    controller.keyDown({ key: "a" });
    expect(host.pressed).toEqual([{ pitch: 0, midi: noteNameToMidi("C4") }]);
    controller.keyUp({ key: "a" });
    expect(host.released).toEqual([{ pitch: 0, midi: noteNameToMidi("C4") }]);
  });
});

describe("键盘接到浏览器上", () => {
  it("keydown 起音、keyup 制音、blur 收尾", () => {
    const { engine, pressed, released } = fakeEngine();
    const host = fakeHost(engine);
    const fake = fakeTarget();
    attachComputerKeyboard(() => host, fake.target);

    fake.fire("keydown", { key: "a" });
    expect(pressed).toEqual([noteNameToMidi("C4")]);

    fake.fire("keyup", { key: "a" });
    expect(released).toEqual([1]);

    fake.fire("keydown", { key: "d" });
    fake.fire("blur", {});
    expect(released.sort()).toEqual([1, 2]);
  });

  it("清理之后监听器摘掉，还响着的音也收了", () => {
    const { engine, released } = fakeEngine();
    const host = fakeHost(engine);
    const fake = fakeTarget();
    const detach = attachComputerKeyboard(() => host, fake.target);

    fake.fire("keydown", { key: "a" });
    detach();

    expect(fake.count("keydown")).toBe(0);
    expect(fake.count("keyup")).toBe(0);
    expect(fake.count("blur")).toBe(0);
    expect(released).toEqual([1]);
  });
});

describe("全站唯一的电脑键盘", () => {
  function setup() {
    const { engine, pressed, released } = fakeEngine();
    const fake = fakeTarget();
    const service = createComputerKeyboardService({
      attach: (host) => attachComputerKeyboard(host, fake.target),
      getEngine: () => engine,
    });
    return { service, fake, pressed, released };
  }

  it("第一个订阅者来了才接上键盘，最后一个走了就摘掉", () => {
    const { service, fake } = setup();
    expect(fake.count("keydown")).toBe(0);

    const first = fakeListener();
    const unsubscribeFirst = service.subscribe(first);
    expect(fake.count("keydown")).toBe(1);

    const second = fakeListener();
    const unsubscribeSecond = service.subscribe(second);
    expect(fake.count("keydown")).toBe(1);

    unsubscribeSecond();
    expect(fake.count("keydown")).toBe(1);
    unsubscribeFirst();
    expect(fake.count("keydown")).toBe(0);
  });

  it("所有订阅者都收到按下和松开", () => {
    const { service, fake } = setup();
    const lesson = fakeListener();
    const panel = fakeListener();
    service.subscribe(lesson);
    service.subscribe(panel);

    fake.fire("keydown", { key: "a" });
    fake.fire("keyup", { key: "a" });

    expect(lesson.pressed).toEqual([{ pitch: 0, midi: noteNameToMidi("C4") }]);
    expect(panel.pressed).toEqual([{ pitch: 0, midi: noteNameToMidi("C4") }]);
    expect(lesson.released).toEqual([{ pitch: 0, midi: noteNameToMidi("C4") }]);
    expect(panel.released).toEqual([{ pitch: 0, midi: noteNameToMidi("C4") }]);
  });

  it("两个订阅者也不会响两遍——声音只有一处", () => {
    const { service, fake, pressed } = setup();
    service.subscribe(fakeListener());
    service.subscribe(fakeListener());

    fake.fire("keydown", { key: "a" });
    expect(pressed).toEqual([noteNameToMidi("C4")]);
  });

  it("八度是全站一份，谁改的大家都看得见", () => {
    const { service, fake } = setup();
    const lesson = fakeListener();
    const panel = fakeListener();
    service.subscribe(lesson);
    service.subscribe(panel);

    fake.fire("keydown", { key: "x" });
    expect(service.getOctave()).toBe(5);
    expect(lesson.octaves).toEqual([5]);
    expect(panel.octaves).toEqual([5]);

    service.setOctave(3);
    expect(service.getOctave()).toBe(3);
    expect(panel.octaves).toEqual([5, 3]);
  });

  it("没人订阅时按键盘不响", () => {
    const { service, fake, pressed } = setup();
    fake.fire("keydown", { key: "a" });
    expect(pressed).toEqual([]);
    expect(service.getOctave()).toBe(4);
  });
});

describe("输入框里的键盘事件", () => {
  it("只有输入框、文本域、下拉框才算在打字", () => {
    expect(isTypingTarget({ closest: () => ({}) })).toBe(true);
    expect(isTypingTarget({ closest: () => null })).toBe(false);
    expect(isTypingTarget(null)).toBe(false);
    expect(isTypingTarget(undefined)).toBe(false);
    expect(isTypingTarget({})).toBe(false);
  });
});

describe("订阅者接口", () => {
  it("订阅者只需要三个回调", () => {
    const listener: ComputerKeyboardListener = {
      onPress: () => undefined,
      onRelease: () => undefined,
      onOctave: () => undefined,
    };
    expect(typeof listener.onPress).toBe("function");
  });
});
