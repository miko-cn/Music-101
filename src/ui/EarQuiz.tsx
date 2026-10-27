/**
 * 听辨题的答题区。
 *
 * 每道题独立反馈：选完立刻知道对错，并且能立刻听回自己的选择。
 *
 * 反馈的顺序是刻意的：
 * 1. 选完 → 颜色 + 音效立刻给出（对了绿、错了红并抖一下）
 * 2. 第一次错 → 只给方向（记忆锚口诀），不给答案
 * 3. 第二次还错 → 才亮答案，并且这道题锁死
 *
 * 为什么锁死：答案已经写在脸上，再选一遍不算学会。
 * 锁死之后这道题计为答错（选的仍是错的那项），
 * 学习者知道自己没掌握，可以去复习。
 */
import { useState } from "react";
import { sharedEngine } from "../core/audio/engine.ts";
import { answerVerdict } from "../core/lesson/verdict.ts";
import type { PitchClass } from "../core/theory/pitch.ts";
import type { ScaleId } from "../core/theory/scale.ts";
import { QuizFeedback } from "./QuizFeedback.tsx";
import { QuizGroup, type QuizChoice } from "./QuizOption.tsx";
import { useVerdictSfx } from "./useFeedbackSfx.ts";

/** 一道听辨题。第 1 关和别的关卡共用这个形状。 */
export interface EarQuizItem {
  id: string;
  prompt: string;
  choices: { label: string; midis: number[] }[];
  correct: number;
  explain: string;
}

export function EarQuiz({
  items,
  answers,
  onAnswer,
  hint,
  keyRoot,
  keyScale,
}: {
  items: readonly EarQuizItem[];
  /** 每题当前选中的下标；null = 没选。 */
  answers: readonly (number | null)[];
  onAnswer: (index: number, choice: number) => void;
  /** 答错时给的引导方向，通常是这一关的记忆锚口诀。 */
  hint: string;
  keyRoot: PitchClass;
  keyScale: ScaleId;
}) {
  const [attempts, setAttempts] = useState<number[]>(() => items.map(() => 0));
  const [revealed, setRevealed] = useState<boolean[]>(() => items.map(() => false));
  const playVerdict = useVerdictSfx(keyRoot, keyScale);

  const choose = (index: number, choice: number) => {
    if (revealed[index]) return;
    const question = items[index];
    if (!question) return;
    const verdict = answerVerdict(choice, question.correct);
    // 音效必须在点击的同步链路里发出去，所以放在这里而不是 useEffect。
    playVerdict(verdict);
    if (verdict === "wrong") {
      setAttempts((current) => current.map((value, at) => (at === index ? value + 1 : value)));
    }
    onAnswer(index, choice);
  };

  return (
    <>
      {items.map((question, index) => {
        const chosen = answers[index] ?? null;
        const verdict = answerVerdict(chosen, question.correct);
        const isRevealed = revealed[index] ?? false;
        const choices: QuizChoice[] = question.choices.map((choice) => ({
          label: choice.label,
          onPlay: () => {
            const active = sharedEngine();
            if (!active) return;
            void active.resume();
            active.playEarOption(choice.midis);
          },
        }));
        return (
          <section key={question.id} className="ear-question">
            <h2 className="result-heading">{question.prompt}</h2>
            <QuizGroup
              choices={choices}
              value={chosen}
              onChange={(choice) => choose(index, choice)}
              correct={question.correct}
              revealed={isRevealed}
              lockCorrect
              disabled={isRevealed}
              label={question.prompt}
            />
            {chosen !== null && (
              <QuizFeedback
                correct={verdict === "correct"}
                seed={index}
                hint={hint}
                reveal={question.choices[question.correct]?.label ?? ""}
                explanation={question.explain}
                attempts={attempts[index] ?? 0}
                revealed={isRevealed}
                onReveal={() => setRevealed((current) => current.map((value, at) => (at === index ? true : value)))}
              />
            )}
          </section>
        );
      })}
    </>
  );
}
