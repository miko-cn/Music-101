/**
 * 复习卡抽题。
 *
 * 内容从关卡文件里抽，不另外存一份题——
 * 关卡改了题，复习页自动跟着改，不会两边对不上。
 *
 * 与 review.ts 分开是因为这里要 import content，
 * 而 review.ts 是纯逻辑（不 import 任何东西），单测跑起来更干净。
 */
import { LEVEL1_EAR } from "../../content/lessons/level-01.ts";
import { lessonById } from "../../content/index.ts";
import { isStageLesson } from "../../content/types.ts";
import { shuffleChoices } from "./review.ts";

export interface ReviewChoice {
  label: string;
  midis: number[];
}

export interface ReviewQuestion {
  id: string;
  prompt: string;
  choices: ReviewChoice[];
  /** 正确项在 choices 里的下标。 */
  correct: number;
  explain: string;
  /** 这一关的记忆锚名——答错时给学习者补一句。 */
  anchorName: string;
  anchorHook: string;
}

interface FlatQuestion {
  id: string;
  prompt: string;
  choices: ReviewChoice[];
  correct: number;
  explain: string;
}

/** 第 1 关的选项是单个音，统一成数组——后面播放和出题都用同一种形状。 */
function fromLevel1(): FlatQuestion[] {
  return LEVEL1_EAR.map((question) => ({
    id: question.id,
    prompt: question.prompt,
    choices: question.choices.map((choice) => ({ label: choice.label, midis: [choice.midi] })),
    correct: question.correct,
    explain: question.explain,
  }));
}

function fromStage(ear: readonly { id: string; prompt: string; choices: { label: string; midis: number[] }[]; correct: number; explain: string }[]): FlatQuestion[] {
  return ear.map((question) => ({
    id: question.id,
    prompt: question.prompt,
    choices: question.choices.map((choice) => ({ label: choice.label, midis: [...choice.midis] })),
    correct: question.correct,
    explain: question.explain,
  }));
}

/**
 * 抽一关的一道听辨题来做复习。
 *
 * 第几道由 round 决定：每复习一轮换一道，一关里的题都能轮到，
 * 不会只把同一道题背熟。
 *
 * 选项会重新打乱：答案位置固定的话，学习者记住的是位置不是内容，
 * 听辨能力就练不出来。种子跟关号和轮次绑定——
 * 同一轮里刷新页面顺序不变，换一轮才换位置。
 */
export function reviewQuestionFor(levelId: number, round: number): ReviewQuestion | null {
  const lesson = lessonById(levelId);
  if (!lesson) return null;
  const pool =
    levelId === 1 ? fromLevel1() : isStageLesson(lesson) ? fromStage(lesson.ear) : [];
  if (pool.length === 0) return null;
  const index = ((Math.trunc(round) % pool.length) + pool.length) % pool.length;
  const question = pool[index];
  const order = shuffleChoices(
    question.choices.map((_, position) => position),
    `${levelId}#${round}`,
  );
  return {
    id: question.id,
    prompt: question.prompt,
    choices: order.map((position) => question.choices[position]),
    correct: order.indexOf(question.correct),
    explain: question.explain,
    anchorName: lesson.anchor.name,
    anchorHook: lesson.anchor.hook,
  };
}
