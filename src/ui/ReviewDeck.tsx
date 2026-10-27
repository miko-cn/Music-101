import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Button, Card, Flex, Space, Tag } from "antd";
import { sharedEngine } from "../core/audio/engine.ts";
import { lessonById } from "../content/index.ts";
import { isStageLesson } from "../content/types.ts";
import { QuizGroup } from "./QuizOption.tsx";
import { useFeedbackSfx } from "./useFeedbackSfx.ts";
import {
  dueReviewCards,
  findReviewCard,
  nextReviewDueAt,
  reviewDueText,
  type ReviewCard,
} from "../core/lesson/review.ts";
import { reviewQuestionFor, type ReviewQuestion } from "../core/lesson/review-questions.ts";
import { gradeReview, type ProgressFile, type ProgressUpdate } from "../core/lesson/progress.ts";

/**
 * 今日复习。
 *
 * 一关一张卡（Leitner 盒）：到期的关卡抽一道听辨题出来，
 * 答对了这一档往后挪，答错了掉回最低档、今天还要再练。
 *
 * 抽到的是哪一道由卡片自己的轮次决定，所以每轮复习换一道题，
 * 一关里的题都能轮到；选项还会重新打乱，记住的是内容不是位置。
 */

const OPTION_GAP_MS = 900;

interface GradedItem {
  levelId: number;
  correct: boolean;
}

export function ReviewDeck({
  progress,
  onProgress,
  onOpenLevel,
}: {
  progress: ProgressFile;
  onProgress: (update: ProgressUpdate) => void;
  onOpenLevel: (levelId: number) => void;
}) {
  const due = useMemo(() => dueReviewCards(progress.reviews, Date.now()), [progress.reviews]);
  const [queue, setQueue] = useState<number[] | null>(null);
  const [cursor, setCursor] = useState(0);
  const [current, setCurrent] = useState<{ levelId: number; question: ReviewQuestion } | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [results, setResults] = useState<GradedItem[]>([]);
  const timers = useRef<number[]>([]);

  useEffect(
    () => () => {
      for (const id of timers.current) window.clearTimeout(id);
    },
    [],
  );

  const engine = async () => {
    const active = sharedEngine();
    await active?.resume();
    return active;
  };

  /**
   * 复习题的反馈音用当前关卡的调。
   *
   * 复习抽的是各关的题，每关的调不一样；用题目所属关卡的调，
   * 「对了」那一声就在学习者正在练的那个调里。
   */
  const reviewLesson = current ? lessonById(current.levelId) : null;
  const reviewKey = reviewLesson && isStageLesson(reviewLesson) ? reviewLesson : null;
  const playCue = useFeedbackSfx(reviewKey?.keyRoot ?? 0, reviewKey?.keyScale ?? "major");

  /** 把这道题的每一个选项依次弹一遍——先听清，再选。 */
  const playAll = async (question: ReviewQuestion) => {
    const active = await engine();
    if (!active) return;
    for (const id of timers.current) window.clearTimeout(id);
    timers.current = [];
    question.choices.forEach((choice, index) => {
      if (index === 0) {
        active.playEarOption(choice.midis);
        return;
      }
      const id = window.setTimeout(() => active.playEarOption(choice.midis), OPTION_GAP_MS * index);
      timers.current.push(id);
    });
  };

  /** 抽题：卡片自己的轮次决定抽哪一道，选项重新打乱。 */
  const loadQuestion = (levelId: number) => {
    const card = findReviewCard(progress.reviews, levelId);
    const question = reviewQuestionFor(levelId, card?.round ?? 0);
    setCurrent(question ? { levelId, question } : null);
    setPicked(null);
  };

  const start = () => {
    const levels = due.map((card) => card.levelId);
    setQueue(levels);
    setCursor(0);
    setResults([]);
    if (levels.length > 0) loadQuestion(levels[0]);
  };

  const pick = (optionIndex: number) => {
    if (!current || picked !== null) return;
    setPicked(optionIndex);
    const correct = optionIndex === current.question.correct;
    // 音效在点击的同步链路里发出去，浏览器才认这是用户手势。
    playCue(correct ? "correct" : "wrong");
    setResults((items) => [...items, { levelId: current.levelId, correct }]);
    onProgress((value) =>
      gradeReview(value, { levelId: current.levelId, correct, now: Date.now() }),
    );
  };

  const next = () => {
    if (!queue) return;
    const nextIndex = cursor + 1;
    if (nextIndex >= queue.length) {
      setCurrent(null);
      setQueue(null);
      return;
    }
    setCursor(nextIndex);
    loadQuestion(queue[nextIndex]);
  };

  // —— 还没开始：列出今天要复习的 ——
  if (!queue) {
    if (results.length > 0) {
      const right = results.filter((item) => item.correct).length;
      const left = due.length;
      return (
        <Card title="今天的复习做完了">
          <Alert
            type={right === results.length ? "success" : "warning"}
            showIcon
            title={`复习了 ${results.length} 关，答对 ${right} 关。`}
            description={
              left > 0
                ? `还有 ${left} 关留在今天——刚才没记住的，盒子掉回最低档，今天还会再出现一次。`
                : "全部记住了。下一批到期时会再来叫你。"
            }
          />
          <Flex gap={12} wrap style={{ marginTop: 12 }}>
            <Button type="primary" onClick={start}>
              再来一轮
            </Button>
            <Button onClick={() => setResults([])}>返回</Button>
          </Flex>
        </Card>
      );
    }
    if (due.length === 0) {
      const next = nextReviewDueAt(progress.reviews);
      return (
        <Card title="今日复习">
          <p className="lead">今天没有到期的复习。</p>
          <p className="hint">
            {next === null
              ? "还没有复习卡片——过关之后这一关会自动进队列。"
              : `下一批 ${reviewDueText(next, Date.now())}到期。`}
          </p>
        </Card>
      );
    }
    return (
      <Flex vertical gap={16}>
        <Card title={`今天要复习 ${due.length} 关`}>
          <p className="hint">
            每关抽一道听辨题：先听清楚，再选。答对就往后挪一档，答错会留在今天。
          </p>
          <Flex vertical gap={8} style={{ marginTop: 12 }}>
            {due.map((card) => (
              <DueRow key={card.id} card={card} onOpenLevel={onOpenLevel} />
            ))}
          </Flex>
          <Button type="primary" style={{ marginTop: 16 }} onClick={start}>
            开始今天这 {due.length} 关
          </Button>
        </Card>
      </Flex>
    );
  }

  // —— 正在答题 ——
  if (!current) {
    return (
      <Card title="今日复习">
        <p className="hint">这一关暂时抽不出题目，跳过它继续。</p>
        <Button onClick={next}>继续</Button>
      </Card>
    );
  }
  const question = current.question;
  const answered = picked !== null;
  const correct = answered && picked === question.correct;
  const lesson = lessonById(current.levelId);

  return (
    <Flex vertical gap={12}>
      <Card
        title={`第 ${current.levelId} 关 · ${lesson?.title ?? ""}`}
        extra={
          <Space>
            <span className="hint">
              {cursor + 1} / {queue.length}
            </span>
            <Button onClick={() => void playAll(question)}>都听一遍</Button>
          </Space>
        }
      >
        <h2 className="result-heading">{question.prompt}</h2>
        <QuizGroup
          choices={question.choices.map((choice) => ({
            label: choice.label,
            onPlay: () => {
              const active = sharedEngine();
              if (!active) return;
              void active.resume();
              active.playEarOption(choice.midis);
            },
          }))}
          value={picked}
          onChange={pick}
          correct={question.correct}
          revealed={answered}
          disabled={answered}
          label={question.prompt}
        />

        {answered && (
          <Flex vertical gap={8} style={{ marginTop: 12 }}>
            <Alert
              type={correct ? "success" : "error"}
              showIcon
              title={correct ? "对了。" : `不对，正确答案是「${question.choices[question.correct]?.label}」。`}
              description={question.explain}
            />
            {!correct && (
              <p className="hint">
                这一关的记忆锚是「{question.anchorName}」：{question.anchorHook}
              </p>
            )}
            <Button type="primary" onClick={next}>
              {cursor + 1 >= queue.length ? "看今天的结果" : "下一题"}
            </Button>
          </Flex>
        )}
      </Card>
    </Flex>
  );
}

function DueRow({ card, onOpenLevel }: { card: ReviewCard; onOpenLevel: (levelId: number) => void }) {
  const lesson = lessonById(card.levelId);
  return (
    <Flex gap={8} align="center" wrap>
      <Tag>第 {card.levelId} 关</Tag>
      <span>{lesson?.title ?? ""}</span>
      <span className="hint">{lesson?.anchor.name ?? ""}</span>
      <Tag color="blue">盒子 {card.box}</Tag>
      <Button size="small" onClick={() => onOpenLevel(card.levelId)}>
        去看这一关
      </Button>
    </Flex>
  );
}
