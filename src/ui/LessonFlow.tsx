import { useEffect, useRef, useState, startTransition } from "react";
import { Alert, Button, Card, Flex, Radio, Steps } from "antd";
import { sharedEngine } from "../core/audio/engine.ts";
import { computerKeyLabel } from "../core/lesson/keys.ts";
import { computerKeyboard } from "../core/lesson/computer-keyboard.ts";
import { answerVerdict, anchorHint } from "../core/lesson/verdict.ts";
import {
  applyRecipeToStage,
  buildAttempt,
  classifyHand,
  recipeFromStage,
} from "../core/lesson/personalize.ts";
import { observeAttempt, recordVisit, saveRecipe, type ProgressFile, type ProgressUpdate, type Recipe } from "../core/lesson/progress.ts";
import { LESSON_POLICY, canEnterLessonStep, createSession, sessionSummary } from "../core/lesson/session.ts";
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
import { LessonDiagrams } from "./diagrams/index.tsx";
import { LessonCoach } from "./LessonCoach.tsx";
import { LessonHeader } from "./LessonHeader.tsx";
import { MemoryAnchorCard } from "./MemoryAnchorCard.tsx";
import { QuizGroup } from "./QuizOption.tsx";
import { QuizSession } from "./session/QuizSession.tsx";
import { useFeedbackSfx, useVerdictSfx } from "./useFeedbackSfx.ts";
import { Piano } from "./Piano.tsx";
import { Stepper } from "./Stepper.tsx";

function lessonSteps(earTitle: string, earDone: boolean) {
  return [
    { title: "概念" },
    { title: earTitle },
    { title: "手做", disabled: !earDone },
    { title: "诊断", disabled: !earDone },
    { title: "记忆点", disabled: !earDone },
    { title: "导出", disabled: !earDone },
  ];
}

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
  const [octave, setOctave] = useState(() => computerKeyboard.getOctave());
  const [held, setHeld] = useState<ReadonlySet<PitchClass>>(() => new Set());
  const [state, setState] = useState<StageState>(() => emptyStageState(lesson));
  const [earSession, setEarSession] = useState(() => createSession(lesson.ear, Date.now()));
  const [candidates, setCandidates] = useState<ReferenceCandidates | null>(null);
  const [visitTick, setVisitTick] = useState(0);
  // 关号变了就在这次渲染里清空。放进 effect 的话，新关的题目会配着上一关的会话先画一帧。
  const [seenId, setSeenId] = useState(lesson.id);
  if (seenId !== lesson.id) {
    setSeenId(lesson.id);
    setStep(0);
    setState(emptyStageState(lesson));
    setEarSession(createSession(lesson.ear, Date.now()));
    setHeld(new Set());
    setCandidates(null);
  }
  const seenLesson = useRef<number | null>(null);
  const visitId = useRef(`${lesson.id}:${Date.now()}`);
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
    if (!pendingRecipe || pendingRecipe.levelId !== lesson.id) return;
    setState((current) => applyRecipeToStage(current, pendingRecipe));
    onConsumeRecipe();
  }, [pendingRecipe, lesson.id, onConsumeRecipe]);

  /**
   * 电脑键由全站唯一的服务负责发声，这里只订阅：按下点亮琴键，松手熄灭。
   */
  useEffect(() => {
    const unsubscribe = computerKeyboard.subscribe({
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
    });
    // 每关都从中央 C 附近开始。
    computerKeyboard.setOctave(4);
    return unsubscribe;
  }, []);

  const diagnostics = diagnoseStage(lesson, state);
  const passed = stagePassed(lesson, state);

  const playVerdict = useVerdictSfx(lesson.keyRoot, lesson.keyScale);
  const playPass = useFeedbackSfx(lesson.keyRoot, lesson.keyScale);

  /**
   * 过关的那一瞬间：播一次过关音。
   *
   * 用 ref 记住「已经响过」，因为 passed 会随每次改动重新计算，
   * 不加这个守卫会响一串。
   *
   * 音效放在 effect 里有一个坑：浏览器要求音频在用户手势内启动。
   * 这里过关多半发生在用户点「下一步」之后，AudioContext 早就在
   * 手势里 resume 过了，所以能响。第一次进来就直接过关的情况
   * （比如套用配方）可能静音——那是可以接受的降级，不影响做题。
   */
  const passedAnnounced = useRef(false);
  useEffect(() => {
    if (!passed) {
      passedAnnounced.current = false;
      return;
    }
    if (passedAnnounced.current) return;
    passedAnnounced.current = true;
    playPass("pass");
  }, [passed, playPass]);

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
    // 两级提示允许改对，但把选项挨个试一遍刷出来的全对不该算「轻松」。
    const earCorrect = Math.min(ear.correct, sessionSummary(earSession, lesson.ear).firstTryCorrect);
    onProgress((current) =>
      observeAttempt(
        current,
        buildAttempt({
          visitId: visitId.current,
          levelId: lesson.id,
          passed,
          earCorrect,
          earTotal: ear.total,
          usedFix: usedFix.current,
          mistakes: seenMistakes.current,
        }),
      ),
    );
  }, [lesson, step, passed, state.earAnswers, earSession, state.hand, visitTick, onProgress]);

  const engine = async () => {
    const active = sharedEngine();
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

  const earTitle = lesson.earTitle ?? "听辨";
  const earDone = earSession.finishedAt !== null;
  const steps = lessonSteps(earTitle, earDone);
  const go = (next: number) => {
    if (!canEnterLessonStep(next, earSession.finishedAt)) return;
    startTransition(() => setStep(next));
  };

  return (
    <>
      <LessonHeader levelId={lesson.id} title={lesson.title} />
      <Steps current={step} items={steps} onChange={go} />
      <LessonCoach progress={progress} levelId={lesson.id} onOpenLevel={onOpenLevel} />
      <p className="hint">白键 A S D F G H J，黑键 W E T Y U。Z 低八度，X 高八度。</p>
      {step === 0 && (
        <Card title="概念">
          {lesson.concept.map((paragraph) => (
            <p key={paragraph} className="lead">
              {paragraph}
            </p>
          ))}
          <LessonDiagrams lesson={lesson} />
          <Piano
            label="概念键盘"
            spell={(pitch) => pitchClassToName(pitch)}
            keycap={computerKeyLabel}
            isHeld={(pitch) => held.has(pitch)}
            isRoot={() => false}
            inScale={(pitch) => scalePitches.has(pitch)}
            inChord={() => false}
            onPress={(pitch) => {
              computerKeyboard.pressNote((octave + 1) * 12 + pitch);
            }}
            onRelease={(pitch) => {
              computerKeyboard.releaseNote((octave + 1) * 12 + pitch);
            }}
          />
          <MemoryAnchorCard anchor={lesson.anchor} />
        </Card>
      )}
      {step === 1 && (
        <Card title={earTitle}>
          <p className="hint">
            一题一题来：选好了点检查（或按 Enter）。数字键 1、2、3 选选项，空格重播。
          </p>
          <QuizSession
            questions={lesson.ear}
            state={earSession}
            onState={(next) => {
              setEarSession(next);
              // 只同步定稿的答案：没检查完的题保持 null，评分和结算一行不改。
              setState((current) => ({ ...current, earAnswers: next.committed }));
            }}
            policy={LESSON_POLICY}
            seed={visitId.current}
            fallbackHint={anchorHint(lesson.anchor.name, lesson.anchor.hook)}
            keyRoot={lesson.keyRoot}
            keyScale={lesson.keyScale}
            passMark={lesson.earPass}
            onFinish={() => go(2)}
          />
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
            <QuizGroup
              choices={lesson.handChoices.map((choice) => ({ label: choice.label }))}
              value={state.hand}
              onChange={(index) => {
                const verdict = answerVerdict(index, lesson.handCorrect);
                playVerdict(verdict);
                setState((current) => ({ ...current, hand: index }));
              }}
              correct={lesson.handCorrect}
              label={lesson.handPrompt}
            />
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
            {passed && (
              <div className="pass-stamp">
                <span aria-hidden="true">★</span>
                <span>第 {lesson.id} 关通过</span>
              </div>
            )}
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
            <li>
              {earTitle}：{lesson.ear.length} 题里至少对 {lesson.earPass} 题
            </li>
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
        <Button disabled={step === 0} onClick={() => go(step - 1)}>
          上一步
        </Button>
        {/* 听辨没做完时让出主色：会话里的「检查 / 继续」才是这一屏的主行动。没做完不能跳步。 */}
        <Button
          type={step === 1 && earSession.finishedAt === null ? "default" : "primary"}
          disabled={step === steps.length - 1 || !canEnterLessonStep(step + 1, earSession.finishedAt)}
          onClick={() => go(step + 1)}
        >
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
