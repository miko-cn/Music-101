import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Button, Drawer, Flex, Select, Space, Switch, Tag } from "antd";
import { createEngine, type MusicEngine } from "../core/audio/engine.ts";
import { midiToNoteName } from "../core/theory/pitch.ts";
import { toNotationName } from "../core/theory/notation.ts";
import { centeredKeyboardLayout, quizHighlight } from "../core/theory/keyboard.ts";
import { Keyboard } from "./Keyboard.tsx";
import { NoteName } from "./NoteName.tsx";

/** 12 个音类，附带两种拼写，方便和谱面/软件里的写法对上。 */
const PITCH_CLASS_OPTIONS = [
  { value: 0, label: "C" },
  { value: 1, label: "C♯ / D♭" },
  { value: 2, label: "D" },
  { value: 3, label: "D♯ / E♭" },
  { value: 4, label: "E" },
  { value: 5, label: "F" },
  { value: 6, label: "F♯ / G♭" },
  { value: 7, label: "G" },
  { value: 8, label: "G♯ / A♭" },
  { value: 9, label: "A" },
  { value: 10, label: "A♯ / B♭" },
  { value: 11, label: "B" },
];

const OCTAVE_OPTIONS = [
  { value: 2, label: "2 个八度" },
  { value: 3, label: "3 个八度" },
  { value: 4, label: "4 个八度" },
];

/** 布局以中央 C 为中心。 */
const CENTER_MIDI = 60;

/**
 * 全局键盘面板。
 *
 * 没有实体 MIDI 键盘的时候，「C 在哪个键上」只能靠抽象字母记住。
 * 这个面板把字母和黑白键的物理位置绑在一起：
 * - C4 固定在正中间，向左向右展开，打开就能当尺子用
 * - 多八度铺开，黑键「2 个一组、3 个一组」的重复规律一眼可见
 * - 每个键都印音名（黑键也印）
 * - 「找音」直接定位到所有八度的同名键
 * - 「听一个音」把声音和位置绑定起来：听 → 自己点 → 对错立刻有反馈
 *
 * 发声跟住手指：按下起音，松开制音。按多久响多久，不留一截回声。
 */
export function KeyboardPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [octaves, setOctaves] = useState(3);
  const [showNames, setShowNames] = useState(true);
  const [showMidi, setShowMidi] = useState(false);
  const [showGroups, setShowGroups] = useState(true);
  const [target, setTarget] = useState<number | null>(null);
  const [quiz, setQuiz] = useState<{ midi: number; answered: boolean; correct: boolean } | null>(null);
  const [pressed, setPressed] = useState<ReadonlySet<number>>(new Set());
  const engineRef = useRef<MusicEngine | null>(null);
  /** 正在响的音：MIDI 音高 → 引擎里的句柄。 */
  const voicesRef = useRef(new Map<number, number>());

  const getEngine = (): MusicEngine | null => {
    if (!engineRef.current) engineRef.current = createEngine();
    return engineRef.current;
  };

  const engine = async () => {
    const active = getEngine();
    await active?.resume();
    return active;
  };

  const layout = useMemo(() => centeredKeyboardLayout(CENTER_MIDI, octaves), [octaves]);
  const range = useMemo(() => layout.white.map((key) => key.midi), [layout]);

  // 测验进行中，高亮必须为空：高亮等于直接把答案说出来。
  // 判定规则放在 core 层的纯函数里，这里只负责取结果。
  const { pitchClasses: quizClasses, exact: quizExact } = useMemo(
    () => quizHighlight(quiz),
    [quiz],
  );

  const highlight = useMemo(() => {
    if (quiz) return quizClasses;
    if (target === null) return new Set<number>();
    return new Set([target]);
  }, [quiz, quizClasses, target]);

  const highlightMidi = useMemo(() => (quiz ? quizExact : new Set<number>()), [quiz, quizExact]);

  const positions = useMemo(() => {
    if (target === null) return [];
    return range.filter((midi) => midi % 12 === target);
  }, [range, target]);

  // 面板关掉时把还在响的音制住，别让余音留在后台。
  useEffect(() => {
    return () => {
      for (const id of voicesRef.current.values()) engineRef.current?.releasePitch(id);
      voicesRef.current.clear();
    };
  }, []);

  const flash = (midi: number) => {
    setPressed(new Set([midi]));
    window.setTimeout(() => setPressed(new Set()), 320);
  };

  /** 按下：起音。必须同步完成，否则「快速点一下」会在松手之后才起音。 */
  const press = (midi: number) => {
    setPressed((current) => new Set(current).add(midi));
    const active = getEngine();
    if (active) {
      void active.resume();
      const previous = voicesRef.current.get(midi);
      if (previous !== undefined) active.releasePitch(previous);
      voicesRef.current.set(midi, active.pressPitch(midi));
    }
    // 测验进行中，按下哪个键就是作答。
    if (quiz && !quiz.answered) {
      setQuiz({ ...quiz, answered: true, correct: midi === quiz.midi });
    }
  };

  /** 松开：制音器落下，尾音立刻收掉。 */
  const release = (midi: number) => {
    setPressed((current) => {
      if (!current.has(midi)) return current;
      const next = new Set(current);
      next.delete(midi);
      return next;
    });
    const id = voicesRef.current.get(midi);
    if (id === undefined) return;
    voicesRef.current.delete(midi);
    engineRef.current?.releasePitch(id);
  };

  /** 一次性的试听音（找这个音、听音测验）。 */
  const play = async (midi: number) => {
    flash(midi);
    await engine().then((active) => active?.playPitch(midi));
  };

  const askRandom = async () => {
    const midi = range[Math.floor(Math.random() * range.length)];
    setTarget(null);
    setQuiz({ midi, answered: false, correct: false });
    await engine().then((active) => active?.playPitch(midi));
  };

  return (
    <Drawer title="全局键盘 · 查位置" placement="right" size={880} open={open} onClose={onClose}>
      <p className="hint">
        黑键永远是「2 个一组、3 个一组」循环出现的。2 个黑键那一组，左边紧挨的白键是 <strong>C</strong>；
        3 个黑键那一组，左边紧挨的白键是 <strong>F</strong>。找到 C 和 F，整台键盘的位置就都知道了。
      </p>

      <Flex vertical gap={16} style={{ marginTop: 12 }}>
        <Flex gap={12} wrap align="center">
          <Space>
            <span className="hint">找这个音</span>
            <Select
              aria-label="找这个音"
              placeholder="选一个音名"
              style={{ minWidth: 150 }}
              value={target ?? undefined}
              options={PITCH_CLASS_OPTIONS}
              onChange={(value) => {
                setQuiz(null);
                setTarget(value);
                const midi = range.find((item) => item % 12 === value);
                if (midi !== undefined) void play(midi);
              }}
            />
          </Space>
          <Button onClick={() => void askRandom()}>听一个音，自己找</Button>
          <Space size={4}>
            <span className="hint">音名</span>
            <Switch
              aria-label="显示音名"
              size="small"
              checked={showNames}
              onChange={setShowNames}
            />
          </Space>
          <Space size={4}>
            <span className="hint">MIDI 号</span>
            <Switch
              aria-label="显示 MIDI 号"
              size="small"
              checked={showMidi}
              onChange={setShowMidi}
            />
          </Space>
          <Space size={4}>
            <span className="hint">2-3 分组</span>
            <Switch
              aria-label="显示 2-3 分组"
              size="small"
              checked={showGroups}
              onChange={setShowGroups}
            />
          </Space>
          <Select
            aria-label="显示几个八度"
            style={{ minWidth: 120 }}
            value={octaves}
            options={OCTAVE_OPTIONS}
            onChange={(value) => {
              setOctaves(value);
              setQuiz(null);
            }}
          />
        </Flex>

        <Keyboard
          centerMidi={CENTER_MIDI}
          octaves={octaves}
          showNames={showNames}
          showMidi={showMidi}
          showGroups={showGroups}
          highlight={highlight}
          highlightMidi={highlightMidi}
          pressed={pressed}
          onPress={press}
          onRelease={release}
          label="全局参考键盘"
        />

        {target !== null && !quiz && (
          <Alert
            type="info"
            showIcon
            title={`${PITCH_CLASS_OPTIONS[target]?.label} 在这里：`}
            description={
              <Space wrap size={[8, 8]}>
                {positions.map((midi) => (
                  <Tag
                    key={midi}
                    color="blue"
                    style={{ cursor: "pointer" }}
                    onClick={() => void play(midi)}
                  >
                    <NoteName name={midiToNoteName(midi)} />（MIDI {midi}）
                  </Tag>
                ))}
              </Space>
            }
          />
        )}

        {quiz && (
          <Alert
            type={!quiz.answered ? "warning" : quiz.correct ? "success" : "error"}
            showIcon
            title={
              !quiz.answered
                ? "刚才播了一个音，在键盘上点一下它在哪。"
                : quiz.correct
                  ? `对了！那是 ${toNotationName(midiToNoteName(quiz.midi))}（MIDI ${quiz.midi}）`
                  : `不对，那是 ${toNotationName(midiToNoteName(quiz.midi))}（MIDI ${quiz.midi}）`
            }
            description={
              !quiz.answered ? (
                <Button size="small" onClick={() => void play(quiz.midi)}>
                  再听一次
                </Button>
              ) : (
                <Space>
                  <Button size="small" onClick={() => void play(quiz.midi)}>
                    再听一次
                  </Button>
                  <Button size="small" onClick={() => void askRandom()}>
                    换一个
                  </Button>
                </Space>
              )
            }
          />
        )}

        <p className="hint">
          <strong>按住琴键</strong>声音就会一直响，<strong>松手</strong>立刻收掉——延音由你按多久决定。
          白键是 C D E F G A B，黑键是它们中间的升号音；同名音每高一个八度就再加 1。
          中央 C 记成 C4，MIDI 编号 60，就在键盘正中间。
        </p>
      </Flex>
    </Drawer>
  );
}
