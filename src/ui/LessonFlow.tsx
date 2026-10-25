import { useEffect, useRef, useState } from "react";
import { Alert, Button, Card, Flex, Radio, Steps } from "antd";
import { createEngine, type MusicEngine } from "../core/audio/engine.ts";
import { computerKeyLabel } from "../core/lesson/keys.ts";
import { attachComputerKeyboard, type ComputerKeyboardHost } from "../core/lesson/keyboard.ts";
import {
  applyRecipeToStage,
  buildAttempt,
  classifyHand,
  recipeFromStage,
} from "../core/lesson/personalize.ts";
import { observeAttempt, recordVisit, saveRecipe, type ProgressFile, type ProgressUpdate, type Recipe } from "../core/lesson/progress.ts";
import {
  STAGE_FIX_HAND,
  applyStageFix,
  diagnoseStage,
  emptyStageState,
  stageEarScore,
  stagePassed,
  stageToMidi,
  type StageState,
} from "../core/lesson/stage1.ts";
import { pitchClassToName, type PitchClass } from "../core/theory/pitch.ts";
import { getScalePitches } from "../core/theory/scale.ts";
import { energySeries } from "../core/analyze/energy.ts";
import { choiceEnergySong } from "../core/lesson/stage1.ts";
import { candidatesFromPcm, demoClicks, type ReferenceCandidates } from "../core/reference/candidates.ts";
import { referenceToMidi } from "../core/reference/export.ts";
import type { StageLesson } from "../content/types.ts";
import { EnergyChart } from "./DiagnosticsLab.tsx";
import { LessonCoach } from "./LessonCoach.tsx";
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

export function LessonFlow({
  lesson,
  progress,
  onProgress,
  pendingRecipe,
  onConsumeRecipe,
  onOpenLevel,
}: {
  lesson: StageLesson;
  progress: ProgressFile;
  onProgress: (update: ProgressUpdate) => void;
  pendingRecipe: Recipe | null;
  onConsumeRecipe: () => void;
  onOpenLevel: (levelId: number) => void;
}) {
  const [step, setStep] = useState(0);
  const [octave, setOctave] = useState(4);
  const [held, setHeld] = useState<ReadonlySet<PitchClass>>(() => new Set());
  const [state, setState] = useState<StageState>(() => emptyStageState(lesson));
  const [candidates, setCandidates] = useState<ReferenceCandidates | null>(null);
  const [visitTick, setVisitTick] = useState(0);
  const engineRef = useRef<MusicEngine | null>(null);
  /** 电脑键接线要用的界面状态。每次渲染更新，事件发生时读到的就是最新的。 */
  const hostRef = useRef<ComputerKeyboardHost | null>(null);
  const seenLesson = useRef<number | null>(null);  const visitId = useRef(`${lesson.id}:${Date.now()}`);
  const usedFix = useRef(false);
  const seenMistakes = useRef<ReturnType<typeof classifyHand>>([]);
  const lessonChanged = seenLesson.current !== null && seenLesson.current !== lesson.id;
  if (lessonChanged) {
    visitId.current = `${lesson.id}:${Date.now()}`;
    usedFix.current = false;
    seenMistakes.current = [];
  }
  if (!lessonChanged && state.hand !== null) {
    for (const kind of classifyHand(lesson.id, state.hand, lesson.handCorrect)) {
      if (!seenMistakes.current.includes(kind)) seenMistakes.current.push(kind);
    }
  }
  const scalePitches = new Set(getScalePitches(lesson.keyRoot, lesson.keyScale));

  useEffect(() => {
    setStep(0);
    setState(emptyStageState(lesson));
    setHeld(new Set());
    setCandidates(null);
  }, [lesson.id]);

  useEffect(() => {
    if (!pendingRecipe || pendingRecipe.levelId !== lesson.id) return;
    setState((current) => applyRecipeToStage(current, pendingRecipe));
    onConsumeRecipe();
  }, [pendingRecipe, lesson.id, onConsumeRecipe]);

  /** 同步拿到引擎。起音必须同步完成，否则「快速点一下」会在松手之后才起音。 */
  function getEngine(): MusicEngine | null {
    if (!engineRef.current) engineRef.current = createEngine();
    return engineRef.current;
  }

  // 电脑键接线：按下起音、松手制音，延音跟住按住时长。
  // 规则只有一份（core/lesson/keyboard.ts），这里只把界面状态接上去。
  hostRef.current = {
    getOctave: () => octave,
    getEngine,
    onPress: (pitch) => {
      setHeld((current) => (current.has(pitch) ? current : new Set(current).add(pitch)));
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

  const diagnostics = diagnoseStage(lesson, state);
  const passed = stagePassed(lesson, state);

  useEffect(() => {
    if (seenLesson.current !== lesson.id) {
      seenLesson.current = lesson.id;
      // 进关卡就记一次活动——热力图画的是「今天来过」，不是「今天做完」。
      onProgress((current) =>
        recordVisit(current, { visitId: visitId.current, levelId: lesson.id }),
      );
      return;
    }
    if (step < 3 && !passed) return;
    const ear = stageEarScore(lesson, state.earAnswers);
    onProgress((current) =>
      observeAttempt(
        current,
        buildAttempt({
          visitId: visitId.current,
          levelId: lesson.id,
          passed,
          earCorrect: ear.correct,
          earTotal: ear.total,
          usedFix: usedFix.current,
          mistakes: seenMistakes.current,
        }),
      ),
    );
  }, [lesson, step, passed, state.earAnswers, state.hand, visitTick, onProgress]);

  const engine = async () => {
    const active = getEngine();
    await active?.resume();
    return active;
  };

  const download = () => {
    const bytes = lesson.reference
      ? referenceToMidi(
          candidates?.bpms[state.referencePick?.bpm ?? 0] ?? 120,
          candidates?.structures[state.referencePick?.structure ?? 0]?.sections ?? [
            { name: "Verse", startBar: 0, bars: 16 },
          ],
        )
      : stageToMidi(lesson, lesson.drums ? 0 : (state.hand ?? lesson.handCorrect));
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
      <LessonCoach progress={progress} levelId={lesson.id} onOpenLevel={onOpenLevel} />
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
          <MemoryAnchorCard anchor={lesson.anchor} />
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
                  <Radio key={choiceIndex} value={choiceIndex}>
                    {choice.label}
                  </Radio>
                ))}
              </Radio.Group>
              <Button
                onClick={() => {
                  const chosen = question.choices[state.earAnswers[index] ?? question.correct];
                  void engine().then((active) => active?.playEarOption(chosen?.midis ?? []));
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
          {lesson.audition === "sidechain" && (
            <Button onClick={() => void engine().then((active) => active?.playPump(lesson.bpm))}>听侧链</Button>
          )}
          {lesson.drums ? (
            <Flex vertical gap={12}>
              {lesson.drums.map((lane, laneIndex) => (
                <div key={lane.role}>
                  <p className="hint">{lane.label}</p>
                  <Stepper
                    label={lane.label}
                    lockBars
                    steps={state.drums?.[laneIndex] ?? Array.from({ length: 16 }, () => false)}
                    bars={1}
                    onBars={() => undefined}
                    onSteps={(steps) =>
                      setState((current) => {
                        const drums = (current.drums ?? lesson.drums?.map(() => Array.from({ length: 16 }, () => false)) ?? []).map(
                          (row) => [...row],
                        );
                        drums[laneIndex] = steps.slice(0, 16);
                        return { ...current, drums };
                      })
                    }
                  />
                </div>
              ))}
            </Flex>
          ) : lesson.reference ? (
            <ReferenceHand
              candidates={candidates}
              pick={state.referencePick ?? { bpm: null, key: null, structure: null }}
              onDemo={() => setCandidates(candidatesFromPcm(demoClicks(), 8000))}
              onFile={(samples, sampleRate) => setCandidates(candidatesFromPcm(samples, sampleRate))}
              onPick={(pick) => setState((current) => ({ ...current, referencePick: pick }))}
            />
          ) : (
            <Radio.Group
              value={state.hand ?? undefined}
              onChange={(event) => setState((current) => ({ ...current, hand: Number(event.target.value) }))}
            >
              <Flex vertical gap={8}>
                {lesson.handChoices.map((choice, index) => (
                  <Radio key={index} value={index}>
                    {choice.label}
                  </Radio>
                ))}
              </Flex>
            </Radio.Group>
          )}
          {lesson.showEnergy && state.hand !== null && (
            <EnergyPreview lesson={lesson} choice={state.hand} />
          )}
          <Button onClick={() => onProgress((current) => saveRecipe(current, recipeFromStage(lesson, state)))}>
            存成配方
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
                title={item.message}
                action={
                  item.fix?.actionId === STAGE_FIX_HAND ? (
                    <Button
                      size="small"
                      onClick={() => {
                        usedFix.current = true;
                        setVisitTick((value) => value + 1);
                        setState((current) => applyStageFix(lesson, current));
                      }}
                    >
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
          <MemoryAnchorCard anchor={lesson.anchor} showTakeaway />
          <h2 className="result-heading anchor-takeaway-title">过关标准</h2>
          <ul className="anchor-takeaway">
            <li>听辨：{lesson.ear.length} 题里至少对 {lesson.earPass} 题</li>
            <li>
              手做：
              {lesson.drums
                ? "把鼓型打到目标格"
                : lesson.reference
                  ? "从候选里把 BPM、调、结构各选一个"
                  : "选出正确的那一个"}
            </li>
            <li>诊断：没有 error 就算过关</li>
          </ul>
          {lesson.prereq && lesson.prereq.length > 0 && (
            <p className="hint">
              这一关的地基是第 {lesson.prereq.join("、")} 关。上面哪一条卡住了，就回去重做那几关。
            </p>
          )}
        </Card>
      )}
      {step === 5 && (
        <Card title="导出">
          <p className="lead">导出的是音高和和弦，不是 Cubase 里的音色。拖进去之后要自己选乐器。</p>
          <Alert type={passed ? "success" : "warning"} title={passed ? "可以导出。" : "还没过关。"} />
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

function EnergyPreview({ lesson, choice }: { lesson: StageLesson; choice: number }) {
  const song = choiceEnergySong(lesson, choice);
  if (!song) return null;
  return (
    <div>
      <p className="hint">蓝条是副歌，浅条是主歌。纵轴是这一小节的能量。</p>
      <EnergyChart song={song} series={energySeries(song)} />
    </div>
  );
}

function ReferenceHand({
  candidates,
  pick,
  onDemo,
  onFile,
  onPick,
}: {
  candidates: ReferenceCandidates | null;
  pick: { bpm: number | null; key: number | null; structure: number | null };
  onDemo: () => void;
  onFile: (samples: Float32Array, sampleRate: number) => void;
  onPick: (pick: { bpm: number | null; key: number | null; structure: number | null }) => void;
}) {
  const [note, setNote] = useState<string | null>(null);

  const loadFile = async (file: File) => {
    try {
      const context = new AudioContext();
      const buffer = await context.decodeAudioData(await file.arrayBuffer());
      const channel = buffer.getChannelData(0);
      const copy = new Float32Array(channel.length);
      copy.set(channel);
      await context.close();
      onFile(copy, buffer.sampleRate);
      setNote(`已读取 ${file.name}，下面是候选，选一套即可。`);
    } catch {
      onFile(demoClicks(), 8000);
      setNote("这个文件读不出来，改用示例鼓点。候选已经准备好了。");
    }
  };

  return (
    <Flex vertical gap={12}>
      <Flex gap={8} wrap>
        <Button onClick={onDemo}>示例鼓点</Button>
        <label className="hint">
          或上传本地音频
          <input
            aria-label="上传本地音频"
            type="file"
            accept="audio/*"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void loadFile(file);
            }}
          />
        </label>
      </Flex>
      {note && <p className="hint">{note}</p>}
      {candidates ? (
        <Flex vertical gap={12}>
          <Radio.Group
            value={pick.bpm ?? undefined}
            onChange={(event) => onPick({ ...pick, bpm: Number(event.target.value) })}
          >
            <Flex vertical gap={4}>
              {candidates.bpms.map((bpm, index) => (
                <Radio key={index} value={index}>
                  {bpm} BPM
                </Radio>
              ))}
            </Flex>
          </Radio.Group>
          <Radio.Group
            value={pick.key ?? undefined}
            onChange={(event) => onPick({ ...pick, key: Number(event.target.value) })}
          >
            <Flex vertical gap={4}>
              {candidates.keys.map((label, index) => (
                <Radio key={index} value={index}>
                  {label}
                </Radio>
              ))}
            </Flex>
          </Radio.Group>
          <Radio.Group
            value={pick.structure ?? undefined}
            onChange={(event) => onPick({ ...pick, structure: Number(event.target.value) })}
          >
            <Flex vertical gap={4}>
              {candidates.structures.map((item, index) => (
                <Radio key={index} value={index}>
                  {item.label}
                </Radio>
              ))}
            </Flex>
          </Radio.Group>
        </Flex>
      ) : (
        <p className="hint">还没有候选。先点示例鼓点，或上传一首本地音频。</p>
      )}
    </Flex>
  );
}
