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
  scoreEar,
  type Level1State,
} from "../core/lesson/level1.ts";
import { computerKeyLabel } from "../core/lesson/keys.ts";
import { attachComputerKeyboard, type ComputerKeyboardHost } from "../core/lesson/keyboard.ts";
import { applyRecipeToLevel1, buildAttempt, isMastered, recipeFromLevel1 } from "../core/lesson/personalize.ts";
import { observeAttempt, recordVisit, saveRecipe, type ProgressFile, type ProgressUpdate, type Recipe } from "../core/lesson/progress.ts";
import { midiToNoteName, midiToPitchClass, pitchClassToName, type PitchClass } from "../core/theory/pitch.ts";
import { getScalePitches } from "../core/theory/scale.ts";
import { quarterSteps, resizeSteps, type BarCount } from "../core/sequencer/grid.ts";
import {
  LEVEL1_ANCHOR,
  LEVEL1_BPM,
  LEVEL1_CONCEPT,
  LEVEL1_EAR,
  LEVEL1_EAR_PASS,
  LEVEL1_TARGET_PITCH,
} from "../content/lessons/level-01.ts";
import { LessonCoach } from "./LessonCoach.tsx";
import { NoteName } from "./NoteName.tsx";
import { MemoryAnchorCard } from "./MemoryAnchorCard.tsx";
import { Piano } from "./Piano.tsx";
import { Stepper } from "./Stepper.tsx";

const STEPS = [
  { title: "概念" },
  { title: "听辨" },
  { title: "手做" },
  { title: "诊断" },
  { title: "记忆点" },
  { title: "导出" },
];

function solvedLevel1(): Level1State {
  return {
    earAnswers: LEVEL1_EAR.map((question) => question.correct),
    pitch: LEVEL1_TARGET_PITCH,
    steps: quarterSteps(),
  };
}

export function LessonOne({
  progress,
  onProgress,
  pendingRecipe,
  onConsumeRecipe,
  onOpenLevel,
}: {
  progress: ProgressFile;
  onProgress: (update: ProgressUpdate) => void;
  pendingRecipe: Recipe | null;
  onConsumeRecipe: () => void;
  onOpenLevel: (levelId: number) => void;
}) {
  const mastered = isMastered(progress, 1);
  const [step, setStep] = useState(() => (mastered ? 4 : 0));
  const [octave, setOctave] = useState(4);
  const [bars, setBars] = useState<BarCount>(1);
  const [state, setState] = useState<Level1State>(() => (mastered ? solvedLevel1() : emptyLevel1State()));
  const [visitTick, setVisitTick] = useState(0);
  const [held, setHeld] = useState<ReadonlySet<PitchClass>>(() => new Set());
  const seenLesson = useRef<number | null>(null);
  const visitId = useRef(`1:${Date.now()}`);
  const usedFix = useRef(false);
  const engineRef = useRef<MusicEngine | null>(null);
  /** 电脑键接线要用的界面状态。每次渲染更新，事件发生时读到的就是最新的。 */
  const hostRef = useRef<ComputerKeyboardHost | null>(null);
  const scalePitches = useMemo(() => new Set(getScalePitches(0, "major")), []);
  const diagnostics = diagnoseLevel1(state);
  const passed = level1Passed(state);
  const selectedClass = state.pitch === null ? null : midiToPitchClass(state.pitch);
  const selectedOctave = state.pitch === null ? null : Math.floor(state.pitch / 12) - 1;

  useEffect(() => {
    if (!pendingRecipe || pendingRecipe.levelId !== 1) return;
    setState((current) => applyRecipeToLevel1(current, pendingRecipe));
    onConsumeRecipe();
  }, [pendingRecipe, onConsumeRecipe]);

  useEffect(() => {
    if (seenLesson.current !== 1) {
      seenLesson.current = 1;
      // 进关卡就记一次活动——热力图画的是「今天来过」，不是「今天做完」。
      onProgress((current) => recordVisit(current, { visitId: visitId.current, levelId: 1 }));
      return;
    }
    if (step < 3 && !passed) return;
    const ear = scoreEar(state.earAnswers);
    onProgress((current) =>
      observeAttempt(
        current,
        buildAttempt({
          visitId: visitId.current,
          levelId: 1,
          passed,
          earCorrect: ear.correct,
          earTotal: ear.total,
          usedFix: usedFix.current,
          mistakes: [],
        }),
      ),
    );
  }, [step, passed, state.earAnswers, visitTick, onProgress]);

  /** 同步拿到引擎。起音必须同步完成，否则「快速点一下」会在松手之后才起音。 */
  function getEngine(): MusicEngine | null {
    if (!engineRef.current) engineRef.current = createEngine();
    return engineRef.current;
  }

  const choosePitch = (midi: number) => {
    setState((current) => ({ ...current, pitch: midi }));
  };

  // 电脑键接线：按下起音、松手制音，延音跟住按住时长。
  // 规则只有一份（core/lesson/keyboard.ts），这里只把界面状态接上去。
  hostRef.current = {
    getOctave: () => octave,
    getEngine,
    onPress: (pitch, midi) => {
      setHeld((current) => (current.has(pitch) ? current : new Set(current).add(pitch)));
      choosePitch(midi);
    },
    onRelease: (pitch) => {
      setHeld((current) => {
        if (!current.has(pitch)) return current;
        const next = new Set(current);
        next.delete(pitch);
        return next;
      });
    },
    onOctave: (next) => setOctave(next),
  };

  useEffect(() => attachComputerKeyboard(() => hostRef.current as ComputerKeyboardHost), []);

  const engine = async () => {
    const active = getEngine();
    await active?.resume();
    return active;
  };

  const playQuestion = (midis: readonly number[]) => {
    void engine().then((active) => active?.playSequence(midis));
  };

  const applyFix = (actionId: string) => {
    usedFix.current = true;
    setVisitTick((value) => value + 1);
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
      <LessonCoach progress={progress} levelId={1} onOpenLevel={onOpenLevel} />
      {step === 0 && (
        <Card title="音高与键盘">
          {LEVEL1_CONCEPT.map((paragraph) => (
            <p key={paragraph} className="lead">
              {paragraph}
            </p>
          ))}
          <p className="hint">
            白键 A S D F G H J 是 C D E F G A B，黑键 W E T Y U 是 C# D# F# G# A#。Z 低八度，X 高八度。
          </p>
          <MemoryAnchorCard anchor={LEVEL1_ANCHOR} />
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
            当前八度 {octave}。当前音：{" "}
            {state.pitch === null ? "还没选" : <NoteName name={midiToNoteName(state.pitch)} />}。目标是 C4，格子是第 1、5、9、13 格。
          </p>
          <p className="hint">琴键上的字母是电脑键。按住时对应的琴键会亮。Z 低八度，X 高八度。</p>
          <Piano
            label="第 1 关键盘，点击或用电脑键选择音高"
            rootWord="已选"
            spell={(pitch) => `${pitchClassToName(pitch)}${octave}`}
            keycap={computerKeyLabel}
            isHeld={(pitch) => held.has(pitch)}
            isRoot={(pitch) => selectedClass === pitch && selectedOctave === octave}
            inScale={(pitch) => scalePitches.has(pitch)}
            inChord={(pitch) => selectedClass === pitch}
            onPick={(pitch) => {
              const midi = (octave + 1) * 12 + pitch;
              choosePitch(midi);
              void engine().then((active) => active?.playPitch(midi));
            }}
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
          <Button onClick={() => onProgress((current) => saveRecipe(current, recipeFromLevel1(state)))}>存成配方</Button>
        </Card>
      )}
      {step === 3 && (
        <Card title="诊断">
          <Flex vertical gap={12}>
            {diagnostics.map((item) => (
              <Alert
                key={item.id}
                type={item.severity === "error" ? "error" : item.severity === "warning" ? "warning" : "success"}
                title={item.message}
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
        <Card title="记忆点">
          <MemoryAnchorCard anchor={LEVEL1_ANCHOR} showTakeaway />
          <h2 className="result-heading anchor-takeaway-title">过关标准</h2>
          <ul className="anchor-takeaway">
            <li>听辨：{LEVEL1_EAR.length} 题里至少对 {LEVEL1_EAR_PASS} 题</li>
            <li>手做：点出 C4，并打满四个四分音符</li>
            <li>诊断：没有 error 就算过关</li>
          </ul>
        </Card>
      )}
      {step === 5 && (
        <Card title="导出到 Cubase">
          <p className="lead">
            导出的是音高和节奏，不是音色。网页里的合成器只帮你听个高低；拖进 Cubase 之后要自己选乐器。
          </p>
          <Alert
            type={passed ? "success" : "warning"}
            title={passed ? "可以导出 level1.mid。" : "还没过关。回到听辨、手做或诊断看缺哪一步。"}
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
