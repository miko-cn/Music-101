import { useMemo, useState } from "react";
import { Alert, Button, Card, Flex, Tag } from "antd";
import { lessonById } from "../content/index.ts";
import { isStageLesson } from "../content/types.ts";
import { anchorHint } from "../core/lesson/verdict.ts";
import {
  dueReviewCards,
  nextReviewDueAt,
  reviewDueText,
  type ReviewCard,
} from "../core/lesson/review.ts";
import { reviewQuestionFor } from "../core/lesson/review-questions.ts";
import { gradeReview, type ProgressFile, type ProgressUpdate } from "../core/lesson/progress.ts";
import { REVIEW_POLICY, createSession, type SessionState } from "../core/lesson/session.ts";
import { QuizSession, type SessionQuestionData } from "./session/QuizSession.tsx";

/**
 * 今日复习。
 *
 * 一关一张卡（Leitner 盒）：到期的关卡抽一道听辨题出来，
 * 答对了这一档往后挪，答错了掉回最低档、今天还要再练。
 *
 * 抽到的是哪一道由卡片自己的轮次决定，所以每轮复习换一道题，
 * 一关里的题都能轮到；选项还会重新打乱，记住的是内容不是位置。
 *
 * 答题走跟关卡一样的会话，但只有一次机会：点「检查」才记进盒子，
 * 错了直接亮答案。题目在抽出来时已经洗过，会话不再洗第二遍。
 */

interface GradedItem {
  levelId: number;
  correct: boolean;
}

interface ReviewItem {
  levelId: number;
  question: SessionQuestionData;
}

function reviewItem(levelId: number, round: number): ReviewItem | null {
  const question = reviewQuestionFor(levelId, round);
  if (!question) return null;
  const lesson = lessonById(levelId);
  const stage = lesson && isStageLesson(lesson) ? lesson : null;
  return {
    levelId,
    question: {
      // 关号加进 id：不同关可能抽到同名题目，AnimatePresence 靠 id 区分。
      id: `${levelId}:${question.id}`,
      prompt: question.prompt,
      choices: question.choices,
      correct: question.correct,
      explain: question.explain,
      wrongHint: question.wrongHint ?? anchorHint(question.anchorName, question.anchorHook),
      encourage: question.encourage,
      keyRoot: stage?.keyRoot ?? 0,
      keyScale: stage?.keyScale ?? "major",
    },
  };
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
  const [round, setRound] = useState<ReviewItem[] | null>(null);
  const [session, setSession] = useState<SessionState>(() => createSession([], Date.now()));
  const [results, setResults] = useState<GradedItem[]>([]);

  const start = () => {
    const items = due.flatMap((card) => {
      const item = reviewItem(card.levelId, card.round);
      return item ? [item] : [];
    });
    setResults([]);
    // 一张题都抽不出来就不要建会话：空会话加「不显示结算」会停在空白页上。
    setRound(items);
    setSession(createSession(items.map((item) => item.question), Date.now()));
  };

  if (!round) {
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
            每关抽一道听辨题：选好了点检查。答对就往后挪一档，答错会留在今天。
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

  if (round.length === 0) {
    return (
      <Card title="今日复习">
        <p className="hint">到期的关卡暂时抽不出题目。</p>
        <Button onClick={() => setRound(null)}>返回</Button>
      </Card>
    );
  }

  return (
    <Card title="今日复习">
      <QuizSession
        questions={round.map((item) => item.question)}
        state={session}
        onState={setSession}
        policy={REVIEW_POLICY}
        seed="review"
        shuffle={false}
        fallbackHint=""
        keyRoot={0}
        keyScale="major"
        passMark={null}
        onGraded={(index, correct) => {
          const item = round[index];
          if (!item) return;
          setResults((items) => [...items, { levelId: item.levelId, correct }]);
          onProgress((value) => gradeReview(value, { levelId: item.levelId, correct, now: Date.now() }));
        }}
        onFinish={() => setRound(null)}
      />
    </Card>
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
