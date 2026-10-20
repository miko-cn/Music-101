import { useEffect, useRef, useState } from "react";
import { Alert, Button, Card, Flex, Radio, Steps } from "antd";
import { createEngine, type MusicEngine } from "../core/audio/engine.ts";
import { computerKeyLabel, lessonKeyToMidi, lessonOctaveKey } from "../core/lesson/keys.ts";
import {
  STAGE_FIX_HAND,
  applyStageFix,
  diagnoseStage,
  emptyStageState,
  stagePassed,
  stageToMidi,
  type StageState,
} from "../core/lesson/stage1.ts";
import { midiToPitchClass, pitchClassToName, type PitchClass } from "../core/theory/pitch.ts";
import { getScalePitches } from "../core/theory/scale.ts";
import type { StageLesson } from "../content/stage1.ts";
import { Piano } from "./Piano.tsx";

const STEPS = [
  { title: "概念" },
  { title: "听辨" },
  { title: "手做" },
  { title: "诊断" },
  { title: "导出" },
];

export function LessonFlow({ lesson }: { lesson: StageLesson }) {
  const [step, setStep] = useState(0);
  const [octave, setOctave] = useState(4);
  const [held, setHeld] = useState<ReadonlySet<PitchClass>>(() => new Set());
  const [state, setState] = useState<StageState>(() => emptyStageState(lesson));
  const engineRef = useRef<MusicEngine | null>(null);
  const scalePitches = new Set(getScalePitches(lesson.keyRoot, lesson.keyScale));

  useEffect(() => {
    setStep(0);
    setState(emptyStageState(lesson));
    setHeld(new Set());
  }, [lesson.id]);

  useEffect(() => {
    const typing = (event: KeyboardEvent) => {
      const target = event.target;
      return target instanceof HTMLElement && target.closest("input, textarea, select, .ant-select") !== null;
    };
    const hold = (pitch: PitchClass, down: boolean) => {
      setHeld((current) => {
        if (down === current.has(pitch)) return current;
        const next = new Set(current);
        if (down) next.add(pitch);
        else next.delete(pitch);
        return next;
      });
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (typing(event)) return;
      const nextOctave = lessonOctaveKey(event.key, octave);
      if (nextOctave !== null) {
        event.preventDefault();
        setOctave(nextOctave);
        return;
      }
      const midi = lessonKeyToMidi(event.key, octave);
      if (midi === null) return;
      event.preventDefault();
      hold(midiToPitchClass(midi), true);
      if (!event.repeat) {
        void engine().then((active) => active?.playPitch(midi));
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      const midi = lessonKeyToMidi(event.key, octave);
      if (midi === null) return;
      hold(midiToPitchClass(midi), false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [octave]);

  const diagnostics = diagnoseStage(lesson, state);
  const passed = stagePassed(lesson, state);

  const engine = async () => {
    if (!engineRef.current) engineRef.current = createEngine();
    await engineRef.current?.resume();
    return engineRef.current;
  };

  const download = () => {
    const choice = state.hand ?? lesson.handCorrect;
    const bytes = stageToMidi(lesson, choice);
    const blob = new Blob([bytes.slice()], { type: "audio/midi" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `level${lesson.id}.mid`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Steps current={step} items={STEPS} onChange={setStep} />
      <p className="hint">
        第 {lesson.id} 关 · {lesson.title}。白键 A S D F G H J，黑键 W E T Y U。Z 低八度，X 高八度。
      </p>
      {step === 0 && (
        <Card title={lesson.title}>
          {lesson.concept.map((paragraph) => (
            <p key={paragraph} className="lead">
              {paragraph}
            </p>
          ))}
          <Piano
            label="概念键盘"
            spell={(pitch) => pitchClassToName(pitch)}
            keycap={computerKeyLabel}
            isHeld={(pitch) => held.has(pitch)}
            isRoot={() => false}
            inScale={(pitch) => scalePitches.has(pitch)}
            inChord={() => false}
            onPick={(pitch) => {
              void engine().then((active) => active?.playPitch((octave + 1) * 12 + pitch));
            }}
          />
        </Card>
      )}
      {step === 1 && (
        <Card title="听辨">
          {lesson.ear.map((question, index) => (
            <section key={question.id} className="ear-question">
              <h2 className="result-heading">{question.prompt}</h2>
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
              <Button
                onClick={() => {
                  const chosen = question.choices[state.earAnswers[index] ?? question.correct];
                  void engine().then((active) => active?.playSequence(chosen?.midis ?? []));
                }}
              >
                播放当前选项
              </Button>
              {state.earAnswers[index] !== null && state.earAnswers[index] !== undefined && (
                <p className="hint">{question.explain}</p>
              )}
            </section>
          ))}
        </Card>
      )}
      {step === 2 && (
        <Card title="手做">
          <p className="lead">{lesson.handPrompt}</p>
          <Radio.Group
            value={state.hand ?? undefined}
            onChange={(event) => setState((current) => ({ ...current, hand: Number(event.target.value) }))}
          >
            <Flex vertical gap={8}>
              {lesson.handChoices.map((choice, index) => (
                <Radio key={choice.label} value={index}>
                  {choice.label}
                </Radio>
              ))}
            </Flex>
          </Radio.Group>
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
                  item.fix?.actionId === STAGE_FIX_HAND ? (
                    <Button size="small" onClick={() => setState((current) => applyStageFix(lesson, current))}>
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
        <Card title="导出">
          <p className="lead">导出的是音高和和弦，不是 Cubase 里的音色。拖进去之后要自己选乐器。</p>
          <Alert type={passed ? "success" : "warning"} message={passed ? "可以导出。" : "还没过关。"} />
          <Button type="primary" disabled={!passed} onClick={download}>
            下载 level{lesson.id}.mid
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
