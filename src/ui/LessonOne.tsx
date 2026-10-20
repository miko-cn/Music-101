import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Button, Card, Flex, Radio, Steps } from "antd";
import { createEngine, type MusicEngine } from "../core/audio/engine.ts";
import {
  LEVEL1_FIX_PITCH,
  applyLevel1Fix,
  diagnoseLevel1,
  emptyLevel1State,
  level1Passed,
  level1ToMidi,
  type Level1State,
} from "../core/lesson/level1.ts";
import { lessonKeyToMidi, lessonOctaveKey } from "../core/lesson/keys.ts";
import { loadProgress, saveProgress } from "../core/lesson/progress.ts";
import { midiToNoteName, midiToPitchClass, pitchClassToName } from "../core/theory/pitch.ts";
import { getScalePitches } from "../core/theory/scale.ts";
import { quarterSteps, resizeSteps, type BarCount } from "../core/sequencer/grid.ts";
import {
  LEVEL1_BPM,
  LEVEL1_CONCEPT,
  LEVEL1_EAR,
  LEVEL1_TARGET_PITCH,
} from "../content/level1.ts";
import { Piano } from "./Piano.tsx";
import { Stepper } from "./Stepper.tsx";

const STEPS = [
  { title: "概念" },
  { title: "听辨" },
  { title: "手做" },
  { title: "诊断" },
  { title: "导出" },
];

export function LessonOne() {
  const [step, setStep] = useState(0);
  const [octave, setOctave] = useState(4);
  const [bars, setBars] = useState<BarCount>(1);
  const [state, setState] = useState<Level1State>(emptyLevel1State);
  const engineRef = useRef<MusicEngine | null>(null);
  const scalePitches = useMemo(() => new Set(getScalePitches(0, "major")), []);
  const diagnostics = diagnoseLevel1(state);
  const passed = level1Passed(state);
  const selectedClass = state.pitch === null ? null : midiToPitchClass(state.pitch);
  const selectedOctave = state.pitch === null ? null : Math.floor(state.pitch / 12) - 1;

  useEffect(() => {
    const stored = loadProgress(typeof localStorage === "undefined" ? null : localStorage);
    if (!stored.level1Passed) return;
    setState({
      earAnswers: LEVEL1_EAR.map((question) => question.correct),
      pitch: LEVEL1_TARGET_PITCH,
      steps: quarterSteps(),
    });
    setStep(4);
  }, []);

  useEffect(() => {
    if (!passed || typeof localStorage === "undefined") return;
    saveProgress(localStorage, { schema: 1, level1Passed: true });
  }, [passed]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.closest("input, textarea, select, .ant-select")) return;
      const nextOctave = lessonOctaveKey(event.key, octave);
      if (nextOctave !== null) {
        event.preventDefault();
        setOctave(nextOctave);
        return;
      }
      const midi = lessonKeyToMidi(event.key, octave);
      if (midi === null) return;
      event.preventDefault();
      choosePitch(midi);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [octave]);

  const engine = async () => {
    if (!engineRef.current) engineRef.current = createEngine();
    await engineRef.current?.resume();
    return engineRef.current;
  };

  const choosePitch = (midi: number) => {
    setState((current) => ({ ...current, pitch: midi }));
    void engine().then((active) => active?.playPitch(midi));
  };

  const playQuestion = (midis: readonly number[]) => {
    void engine().then((active) => active?.playSequence(midis));
  };

  const applyFix = (actionId: string) => {
    setState((current) => applyLevel1Fix(current, actionId));
    if (actionId === LEVEL1_FIX_PITCH) setOctave(4);
  };

  const download = () => {
    const bytes = level1ToMidi(state);
    const blob = new Blob([bytes.slice()], { type: "audio/midi" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "level1.mid";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Steps current={step} items={STEPS} onChange={setStep} />
      {step === 0 && (
        <Card title="音高与键盘">
          {LEVEL1_CONCEPT.map((paragraph) => (
            <p key={paragraph} className="lead">
              {paragraph}
            </p>
          ))}
          <p className="hint">电脑键：A 到 K 从当前八度的 C 按半音往上。Q 低八度，W 回到第 4 八度，E 高八度。</p>
        </Card>
      )}
      {step === 1 && (
        <Card title="听辨">
          <p className="hint">选项上写着音名，这是听辨的视觉等价物。想听的话再点播放；不听也能做完。</p>
          {LEVEL1_EAR.map((question, index) => (
            <section key={question.id} className="ear-question">
              <h2 className="result-heading">{question.prompt}</h2>
              <Flex gap={8} wrap align="center">
                <Radio.Group
                  value={state.earAnswers[index] ?? undefined}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    setState((current) => {
                      const earAnswers = current.earAnswers.slice();
                      earAnswers[index] = value;
                      return { ...current, earAnswers };
                    });
                  }}
                >
                  {question.choices.map((choice, choiceIndex) => (
                    <Radio key={choice.label} value={choiceIndex}>
                      {choice.label}
                    </Radio>
                  ))}
                </Radio.Group>
                <Button onClick={() => playQuestion(question.choices.map((choice) => choice.midi))}>
                  播放
                </Button>
              </Flex>
              {state.earAnswers[index] !== null && state.earAnswers[index] !== undefined && (
                <p className="hint">{question.explain}</p>
              )}
            </section>
          ))}
        </Card>
      )}
      {step === 2 && (
        <Card title="点出 C4，并打四个四分音符">
          <p className="lead">
            当前八度 {octave}。当前音：{state.pitch === null ? "还没选" : midiToNoteName(state.pitch)}。目标是 C4，格子是第 1、5、9、13 格。
          </p>
          <Piano
            label="第 1 关键盘，点击选择音高"
            rootWord="已选"
            spell={(pitch) => `${pitchClassToName(pitch)}${octave}`}
            isRoot={(pitch) => selectedClass === pitch && selectedOctave === octave}
            inScale={(pitch) => scalePitches.has(pitch)}
            inChord={(pitch) => selectedClass === pitch}
            onPick={(pitch) => choosePitch((octave + 1) * 12 + pitch)}
          />
          <div className="stepper-block">
            <Stepper
              steps={state.steps}
              bars={bars}
              onBars={setBars}
              onSteps={(steps) => setState((current) => ({ ...current, steps }))}
            />
          </div>
          <Button
            onClick={() => {
              const pitch = state.pitch ?? LEVEL1_TARGET_PITCH;
              void engine().then((active) => active?.playSteps(resizeSteps(state.steps, 1), pitch, LEVEL1_BPM));
            }}
          >
            听步进
          </Button>
        </Card>
      )}
      {step === 3 && (
        <Card title="诊断">
          <Flex vertical gap={12}>
            {diagnostics.map((item) => (
              <Alert
                key={item.id}
                type={item.severity === "error" ? "error" : item.severity === "warning" ? "warning" : "success"}
                message={item.message}
                action={
                  item.fix ? (
                    <Button size="small" onClick={() => applyFix(item.fix?.actionId ?? "")}>
                      {item.fix.label}
                    </Button>
                  ) : undefined
                }
              />
            ))}
          </Flex>
        </Card>
      )}
      {step === 4 && (
        <Card title="导出到 Cubase">
          <p className="lead">
            导出的是音高和节奏，不是音色。网页里的合成器只帮你听个高低；拖进 Cubase 之后要自己选乐器。
          </p>
          <Alert
            type={passed ? "success" : "warning"}
            message={passed ? "可以导出 level1.mid。" : "还没过关。回到听辨、手做或诊断看缺哪一步。"}
          />
          <Button type="primary" disabled={!passed} onClick={download}>
            下载 level1.mid
          </Button>
        </Card>
      )}
      <Flex gap={8}>
        <Button disabled={step === 0} onClick={() => setStep((current) => current - 1)}>
          上一步
        </Button>
        <Button type="primary" disabled={step === STEPS.length - 1} onClick={() => setStep((current) => current + 1)}>
          下一步
        </Button>
      </Flex>
    </>
  );
}
