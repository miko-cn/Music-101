import { Alert, Button, Flex } from "antd";
import { activeDrills, difficultyAdvice, levelStatus, statusText } from "../core/lesson/personalize.ts";
import type { ProgressFile } from "../core/lesson/progress.ts";

export function LessonCoach({
  progress,
  levelId,
  onOpenLevel,
}: {
  progress: ProgressFile;
  levelId: number;
  onOpenLevel: (levelId: number) => void;
}) {
  const status = levelStatus(progress, levelId);
  const text = statusText(status, levelId);
  const drills = activeDrills(progress, levelId);
  const advice = difficultyAdvice(progress.attempts);

  if (!text && drills.length === 0 && !advice) return null;

  return (
    <Flex vertical gap={12}>
      {text ? <Alert type={status === "mastered" ? "success" : "warning"} showIcon title={text} /> : null}
      {drills.map((drill) => (
        <Alert
          key={drill.kind}
          type="warning"
          showIcon
          title={drill.text}
          action={
            <Button size="small" onClick={() => onOpenLevel(drill.levelId)}>
              去第 {drill.levelId} 关
            </Button>
          }
        />
      ))}
      {advice ? (
        <Alert
          type={advice.kind === "harder" ? "info" : "warning"}
          showIcon
          title={advice.text}
          action={
            advice.reviewLevel === null ? undefined : (
              <Button size="small" onClick={() => onOpenLevel(advice.reviewLevel ?? 1)}>
                去复习
              </Button>
            )
          }
        />
      ) : null}
    </Flex>
  );
}
