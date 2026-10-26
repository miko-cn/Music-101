import { useCallback, useEffect, useRef, useState } from "react";
import { Badge, Button, ConfigProvider, Flex, Layout, Select, Tooltip, theme } from "antd";
import zhCN from "antd/locale/zh_CN";
import { LESSONS, lessonById } from "./content/index.ts";
import { isStageLesson } from "./content/types.ts";
import { levelLocked } from "./core/lesson/personalize.ts";
import { loadProgress, saveProgress, type ProgressUpdate, type Recipe } from "./core/lesson/progress.ts";
import { dueReviewCards } from "./core/lesson/review.ts";
import { DiagnosticsLab } from "./ui/DiagnosticsLab.tsx";
import { KeyboardPanel } from "./ui/KeyboardPanel.tsx";
import { LessonFlow } from "./ui/LessonFlow.tsx";
import { LessonOne } from "./ui/LessonOne.tsx";
import { MemoryAnchors } from "./ui/MemoryAnchors.tsx";
import { ProgressBoard } from "./ui/ProgressBoard.tsx";
import { ReviewDeck } from "./ui/ReviewDeck.tsx";
import { TheoryBench } from "./ui/TheoryBench.tsx";

const { Header, Content } = Layout;

type View = "bench" | "lesson" | "diagnostics" | "progress" | "anchors" | "review";

/** 关卡下拉：全部关卡，标题都从关卡文件里来。 */
const LESSON_OPTIONS = LESSONS.map((lesson) => ({
  value: lesson.id,
  label: `第 ${lesson.id} 关 · ${lesson.title}`,
}));

export function App() {
  const [view, setView] = useState<View>("lesson");
  const [level, setLevel] = useState(1);
  const [progress, setProgress] = useState(() => loadProgress(typeof localStorage === "undefined" ? null : localStorage));
  const [pendingRecipe, setPendingRecipe] = useState<Recipe | null>(null);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const progressRef = useRef(progress);
  progressRef.current = progress;
  // 第 1 关走自己的流程，不是标准关卡；这里按「是不是标准关卡」分流，不再写死关号。
  const entry = lessonById(level);
  const stage = entry && isStageLesson(entry) ? entry : null;
  const dueCount = dueReviewCards(progress.reviews, Date.now()).length;

  // 全局快捷键：K 随时呼出键盘查位置（关卡里弹琴用的是 A S D F G H J / W E T Y U，不冲突）
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "k") return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target;
      if (target instanceof HTMLElement && target.closest("input, textarea, select, .ant-select") !== null) return;
      event.preventDefault();
      setKeyboardOpen((open) => !open);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
  const onProgress = useCallback((update: ProgressUpdate) => {
    const next = update(progressRef.current);
    progressRef.current = next;
    setProgress(next);
    if (typeof localStorage !== "undefined") saveProgress(localStorage, next);
  }, []);
  const onConsumeRecipe = useCallback(() => setPendingRecipe(null), []);
  const openLevel = (nextLevel: number) => {
    setPendingRecipe(null);
    setLevel(nextLevel);
    setView("lesson");
  };

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          fontFamily: 'system-ui, -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif',
          colorBgLayout: "#12121a",
          borderRadius: 10,
        },
      }}
    >
      <Layout className="site">
        <Header className="site-header">
          <Flex align="center" justify="space-between" gap={12} wrap style={{ width: "100%" }}>
            <div>
              <h1 className="site-title">Music-101</h1>
              <p className="site-subtitle">kawaii bass / future bass 编曲速成</p>
            </div>
            <Flex gap={8} wrap>
              <Button type={view === "bench" ? "primary" : "default"} onClick={() => setView("bench")}>
                乐理工作台
              </Button>
              <Tooltip title="全局键盘 · 查位置（快捷键 K）">
                <Button onClick={() => setKeyboardOpen(true)}>键盘</Button>
              </Tooltip>
              <Select
                aria-label="关卡"
                value={view === "lesson" ? level : undefined}
                placeholder="关卡"
                style={{ minWidth: 220 }}
                showSearch
                optionFilterProp="label"
                options={LESSON_OPTIONS.map((option) => ({ ...option, disabled: levelLocked(progress, option.value) }))}
                onChange={(value) => {
                  setPendingRecipe(null);
                  setLevel(value);
                  setView("lesson");
                }}
              />
              <Button type={view === "diagnostics" ? "primary" : "default"} onClick={() => setView("diagnostics")}>
                诊断
              </Button>
              <Button type={view === "anchors" ? "primary" : "default"} onClick={() => setView("anchors")}>
                记忆点
              </Button>
              <Badge count={dueCount} size="small" offset={[-2, 2]}>
                <Button type={view === "review" ? "primary" : "default"} onClick={() => setView("review")}>
                  复习
                </Button>
              </Badge>
              <Button type={view === "progress" ? "primary" : "default"} onClick={() => setView("progress")}>
                进度
              </Button>
            </Flex>
          </Flex>
        </Header>
        <Content className="bench">
          {view === "bench" ? (
            <TheoryBench />
          ) : view === "diagnostics" ? (
            <DiagnosticsLab />
          ) : view === "anchors" ? (
            <MemoryAnchors onOpenLevel={openLevel} />
          ) : view === "review" ? (
            <ReviewDeck progress={progress} onProgress={onProgress} onOpenLevel={openLevel} />
          ) : view === "progress" ? (
            <ProgressBoard
              progress={progress}
              onProgress={onProgress}
              onOpenReview={() => setView("review")}
              onApply={(recipe) => {
                setPendingRecipe(recipe);
                setLevel(recipe.levelId);
                setView("lesson");
              }}
            />
          ) : stage ? (
            <LessonFlow
              lesson={stage}
              progress={progress}
              onProgress={onProgress}
              pendingRecipe={pendingRecipe}
              onConsumeRecipe={onConsumeRecipe}
              onOpenLevel={openLevel}
            />
          ) : (
            <LessonOne
              progress={progress}
              onProgress={onProgress}
              pendingRecipe={pendingRecipe}
              onConsumeRecipe={onConsumeRecipe}
              onOpenLevel={openLevel}
            />
          )}
        </Content>
      </Layout>
      <KeyboardPanel open={keyboardOpen} onClose={() => setKeyboardOpen(false)} />
    </ConfigProvider>
  );
}
