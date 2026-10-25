import { useMemo, useRef, useState } from "react";
import { Alert, Button, Drawer, Flex, Select, Space, Switch, Tag } from "antd";
import { createEngine, type MusicEngine } from "../core/audio/engine.ts";
import { midiToNoteName } from "../core/theory/pitch.ts";
import { quizHighlight } from "../core/theory/keyboard.ts";
import { Keyboard } from "./Keyboard.tsx";

/** 12 个音类，附带两种拼写，方便和谱面/软件里的写法对上。 */
const PITCH_CLASS_OPTIONS = [
  { value: 0, label: "C" },
  { value: 1, label: "C# / Db" },
  { value: 2, label: "D" },
  { value: 3, label: "D# / Eb" },
  { value: 4, label: "E" },
  { value: 5, label: "F" },
  { value: 6, label: "F# / Gb" },
  { value: 7, label: "G" },
  { value: 8, label: "G# / Ab" },
  { value: 9, label: "A" },
  { value: 10, label: "A# / Bb" },
  { value: 11, label: "B" },
];

const OCTAVE_OPTIONS = [
  { value: 2, label: "2 个八度" },
  { value: 3, label: "3 个八度" },
  { value: 4, label: "4 个八度" },
];

/**
 * 全局键盘面板。
 *
 * 没有实体 MIDI 键盘的时候，「C 在哪个键上」只能靠抽象字母记住。
 * 这个面板把字母和黑白键的物理位置绑在一起：
 * - 多八度铺开，黑键「2 个一组、3 个一组」的重复规律一眼可见
 * - 每个键都印音名（黑键也印）
 * - 「找音」直接定位到所有八度的同名键
 * - 「听一个音」把声音和位置绑定起来：听 → 自己点 → 对错立刻有反馈
 */
export function KeyboardPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [octaves, setOctaves] = useState(3);
  const [fromMidi, setFromMidi] = useState(36);
  const [showNames, setShowNames] = useState(true);
  const [showMidi, setShowMidi] = useState(false);
  const [showGroups, setShowGroups] = useState(true);
  const [target, setTarget] = useState<number | null>(null);
  const [quiz, setQuiz] = useState<{ midi: number; answered: boolean; correct: boolean } | null>(null);
  const [pressed, setPressed] = useState<ReadonlySet<number>>(new Set());
  const engineRef = useRef<MusicEngine | null>(null);

  const engine = async () => {
    if (!engineRef.current) engineRef.current = createEngine();
    await engineRef.current?.resume();
    return engineRef.current;
  };

  const range = useMemo(() => {
    const notes: number[] = [];
    for (let i = 0; i < octaves * 12; i += 1) notes.push(fromMidi + i);
    return notes;
  }, [fromMidi, octaves]);

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

  const flash = (midi: number) => {
    setPressed(new Set([midi]));
    window.setTimeout(() => setPressed(new Set()), 320);
  };

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

  const onKeyClick = async (midi: number) => {
    await play(midi);
    if (!quiz) return;
    setQuiz({ ...quiz, answered: true, correct: midi === quiz.midi });
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
              setFromMidi(value === 2 ? 48 : 36);
              setQuiz(null);
            }}
          />
        </Flex>

        <Keyboard
          fromMidi={fromMidi}
          octaves={octaves}
          showNames={showNames}
          showMidi={showMidi}
          showGroups={showGroups}
          highlight={highlight}
          highlightMidi={highlightMidi}
          pressed={pressed}
          onPick={(midi) => void onKeyClick(midi)}
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
                    {midiToNoteName(midi)}（MIDI {midi}）
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
                  ? `对了！那是 ${midiToNoteName(quiz.midi)}（MIDI ${quiz.midi}）`
                  : `不对，那是 ${midiToNoteName(quiz.midi)}（MIDI ${quiz.midi}）`
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
          点琴键会发声。白键是 C D E F G A B，黑键是它们中间的升号音；同名音每高一个八度就再加 1。
          中央 C 记成 C4，MIDI 编号 60——所有 MIDI 编号都从它往两边数。
        </p>
      </Flex>
    </Drawer>
  );
}
