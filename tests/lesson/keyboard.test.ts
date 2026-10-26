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

/** 接线用的假宿主：只记下「起了哪个音 / 收了哪个音 / 换到哪个八度」。 */
function fakeHost() {
  const host = {
    octave: 4,
    pressed: [] as number[],
    released: [] as number[],
    octaves: [] as number[],
    getOctave: () => host.octave,
    pressNote: (midi: number) => {
      host.pressed.push(midi);
    },
    releaseNote: (midi: number) => {
      host.released.push(midi);
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
    pressed: [] as { pitch: number; midi: number }[],
    released: [] as { pitch: number; midi: number }[],
    octaves: [] as number[],
    onPress(pitch: number, midi: number) {
      listener.pressed.push({ pitch, midi });
    },
    onRelease(pitch: number, midi: number) {
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
    const host = fakeHost();
    const controller = createKeyboardController(() => host);

    controller.keyDown({ key: "a" });
    expect(host.pressed).toEqual([noteNameToMidi("C4")]);
    expect(controller.soundingCount()).toBe(1);

    controller.keyUp({ key: "a" });
    // 松手收的是当初按下的那个音，不是另起一个新音。
    expect(host.released).toEqual([noteNameToMidi("C4")]);
    expect(controller.soundingCount()).toBe(0);
  });

  it("长按的自动重复不重新起音", () => {
    const host = fakeHost();
    const controller = createKeyboardController(() => host);

    controller.keyDown({ key: "a" });
    controller.keyDown({ key: "a", repeat: true });
    controller.keyDown({ key: "a", repeat: true });
    expect(host.pressed).toHaveLength(1);
    expect(controller.soundingCount()).toBe(1);
  });

  it("焦点在输入框里时不抢键盘", () => {
    const host = fakeHost();
    const controller = createKeyboardController(() => host);

    controller.keyDown({ key: "a", target: { closest: () => ({}) } });
    expect(host.pressed).toEqual([]);
  });

  it("Z / X 换八度，之后弹出来的是新八度", () => {
    const host = fakeHost();
    const controller = createKeyboardController(() => host);

    controller.keyDown({ key: "x" });
    expect(host.octaves).toEqual([5]);
    controller.keyDown({ key: "a" });
    expect(host.pressed).toEqual([noteNameToMidi("C5")]);
  });

  it("按着音换八度之后松手，仍然收得掉", () => {
    const host = fakeHost();
    const controller = createKeyboardController(() => host);

    controller.keyDown({ key: "a" });
    host.octave = 5;
    controller.keyUp({ key: "a" });
    // 松手收的是当初按下的那个音（八度 4 的 C4），不是换过八度后的音。
    expect(host.released).toEqual([noteNameToMidi("C4")]);
    expect(controller.soundingCount()).toBe(0);
  });

  it("窗口失焦把还响着的音全收掉", () => {
    const host = fakeHost();
    const controller = createKeyboardController(() => host);

    controller.keyDown({ key: "a" });
    controller.keyDown({ key: "d" });
    expect(controller.soundingCount()).toBe(2);

    controller.blur();
    expect(host.released.sort()).toEqual([noteNameToMidi("C4"), noteNameToMidi("E4")].sort());
    expect(controller.soundingCount()).toBe(0);
  });

  it("离开这一页时把还响着的音收掉", () => {
    const host = fakeHost();
    const controller = createKeyboardController(() => host);

    controller.keyDown({ key: "a" });
    controller.dispose();
    expect(host.released).toEqual([noteNameToMidi("C4")]);
    expect(controller.soundingCount()).toBe(0);
  });
});

describe("键盘接到浏览器上", () => {
  it("keydown 起音、keyup 制音、blur 收尾", () => {
    const host = fakeHost();
    const fake = fakeTarget();
    attachComputerKeyboard(() => host, fake.target);

    fake.fire("keydown", { key: "a" });
    expect(host.pressed).toEqual([noteNameToMidi("C4")]);

    fake.fire("keyup", { key: "a" });
    expect(host.released).toEqual([noteNameToMidi("C4")]);

    fake.fire("keydown", { key: "d" });
    fake.fire("blur", {});
    expect(host.released).toHaveLength(2);
  });

  it("清理之后监听器摘掉", () => {
    const host = fakeHost();
    const fake = fakeTarget();
    const detach = attachComputerKeyboard(() => host, fake.target);

    fake.fire("keydown", { key: "a" });
    detach();

    expect(fake.count("keydown")).toBe(0);
    expect(fake.count("keyup")).toBe(0);
    expect(fake.count("blur")).toBe(0);
    expect(host.released).toEqual([noteNameToMidi("C4")]);
  });
});

describe("全站唯一的键盘服务", () => {
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

    const unsubscribeFirst = service.subscribe(fakeListener());
    expect(fake.count("keydown")).toBe(1);

    const unsubscribeSecond = service.subscribe(fakeListener());
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

  it("鼠标点琴键也走同一处：起音、点亮、松手收掉", () => {
    const { service, pressed, released } = setup();
    const lesson = fakeListener();
    const panel = fakeListener();
    service.subscribe(lesson);
    service.subscribe(panel);

    // 界面按下琴键 → 服务起音。
    service.pressNote(noteNameToMidi("E4"));
    expect(pressed).toEqual([noteNameToMidi("E4")]);
    expect(lesson.pressed).toEqual([{ pitch: 4, midi: noteNameToMidi("E4") }]);
    expect(panel.pressed).toEqual([{ pitch: 4, midi: noteNameToMidi("E4") }]);

    // 松手 → 制音。
    service.releaseNote(noteNameToMidi("E4"));
    expect(released).toHaveLength(1);
    expect(lesson.released).toEqual([{ pitch: 4, midi: noteNameToMidi("E4") }]);
  });

  it("同一个音重复按下不会叠成两个", () => {
    const { service, pressed, released } = setup();
    service.subscribe(fakeListener());

    service.pressNote(noteNameToMidi("C4"));
    service.pressNote(noteNameToMidi("C4"));
    expect(pressed).toHaveLength(2);
    // 第二个之前，第一个被收掉了。
    expect(released).toHaveLength(1);
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

  it("没人订阅时按电脑键不响", () => {
    const { service, fake, pressed } = setup();
    fake.fire("keydown", { key: "a" });
    expect(pressed).toEqual([]);
    expect(service.getOctave()).toBe(4);
  });

  it("没人订阅时把还响着的音收掉", () => {
    const { service, released } = setup();
    const unsubscribe = service.subscribe(fakeListener());
    service.pressNote(noteNameToMidi("C4"));
    unsubscribe();
    expect(released).toHaveLength(1);
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
