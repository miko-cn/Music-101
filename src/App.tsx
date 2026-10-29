import { useCallback, useEffect, useRef, useState, startTransition, addTransitionType, ViewTransition } from "react";
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
import { PathMap } from "./ui/PathMap.tsx";
import { ProgressBoard } from "./ui/ProgressBoard.tsx";
import { ReviewDeck } from "./ui/ReviewDeck.tsx";
import { SoundToggle } from "./ui/SoundToggle.tsx";
import { SiteFooter } from "./ui/SiteFooter.tsx";
import { TheoryBench } from "./ui/TheoryBench.tsx";
import { palette, radii } from "./ui/theme.ts";
import "./ui/path.css";

const { Header, Content } = Layout;

/**
 * 两种模式。
 *
 * 以前是七个平级按钮并排——那不是导航，是功能清单。
 * 它同时回答了七个问题，于是一个问题也没回答。
 *
 * 现在分成两种心智：
 * - 闯关模式：路径图回答「接下来做什么」，是主线
 * - 工具模式：随时可以进去查东西，是沙盒
 */
type Mode = "learn" | "tools";

/**
 * 闯关模式下的两个画面：路径图和关卡。
 *
 * 单独一个状态而不是靠关号推断——第 1 关也是关卡，
 * 但默认要落在路径图上，不能靠「关号是不是 1」来区分。
 */
type LearnView = "path" | "lesson";

/** 工具模式下的各个页面。 */
type ToolView = "bench" | "diagnostics" | "progress" | "anchors" | "review";

/** 关卡下拉：全部关卡，标题都从关卡文件里来。 */
const LESSON_OPTIONS = LESSONS.map((lesson) => ({
  value: lesson.id,
  label: `第 ${lesson.id} 关 · ${lesson.title}`,
}));

export function App() {
  // 默认落在路径图：打开就该知道接下来做什么。
  const [mode, setMode] = useState<Mode>("learn");
  const [learnView, setLearnView] = useState<LearnView>("path");
  const [toolView, setToolView] = useState<ToolView>("bench");
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

  /**
   * View Transition 只对 startTransition 里的更新生效。
   * 换页都走这里，漏一个那条路径就没有动画。
   */
  const navigate = (update: () => void, direction: "forward" | "back" | "swap" = "swap") => {
    startTransition(() => {
      addTransitionType(direction);
      update();
    });
  };

  /** 进某一关。 */
  const openLevel = (nextLevel: number) => {
    navigate(() => {
      setPendingRecipe(null);
      setLevel(nextLevel);
      setMode("learn");
      setLearnView("lesson");
    }, "forward");
  };

  /** 返回路径图。 */
  const backToPath = () => {
    navigate(() => {
      setMode("learn");
      setLearnView("path");
    }, "back");
  };

  const pageKey = mode === "tools" ? `tools-${toolView}` : learnView === "lesson" ? `lesson-${level}` : "path";

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          fontFamily: 'system-ui, -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif',
          colorBgLayout: palette.bg,
          colorBgContainer: palette.surface,
          colorPrimary: palette.accent,
          colorSuccess: palette.success,
          colorError: palette.danger,
          colorWarning: palette.warning,
          borderRadius: radii.md,
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
            <Flex gap={8} wrap align="center">
              {mode === "learn" ? (
                <>
                  <Button type="primary" onClick={backToPath}>
                    {learnView === "lesson" ? "返回路径" : "学习路径"}
                  </Button>
                  <Select
                    aria-label="关卡"
                    value={level}
                    placeholder="关卡"
                    style={{ minWidth: 200 }}
                    showSearch
                    optionFilterProp="label"
                    options={LESSON_OPTIONS.map((option) => ({ ...option, disabled: levelLocked(progress, option.value) }))}
                    onChange={(value) => {
                      navigate(() => {
                        setPendingRecipe(null);
                        setLevel(value);
                        setLearnView("lesson");
                      });
                    }}
                  />
                  <Badge count={dueCount} size="small" offset={[-2, 2]}>
                    <Button onClick={() => navigate(() => {
                      setMode("tools");
                      setToolView("review");
                    })}>
                      复习
                    </Button>
                  </Badge>
                  {/* 工具入口：随时能进沙盒，但不能挤在主线按钮里。 */}
                  <Button onClick={() => navigate(() => setMode("tools"))}>工具</Button>
                </>
              ) : (
                <>
                  <Button onClick={() => navigate(() => setMode("learn"))}>学习路径</Button>
                  <Button
                    type={toolView === "bench" ? "primary" : "default"}
                    onClick={() => navigate(() => setToolView("bench"))}
                  >
                    乐理工作台
                  </Button>
                  <Button
                    type={toolView === "diagnostics" ? "primary" : "default"}
                    onClick={() => navigate(() => setToolView("diagnostics"))}
                  >
                    诊断
                  </Button>
                  <Button
                    type={toolView === "anchors" ? "primary" : "default"}
                    onClick={() => navigate(() => setToolView("anchors"))}
                  >
                    记忆点
                  </Button>
                  <Badge count={dueCount} size="small" offset={[-2, 2]}>
                    <Button
                      type={toolView === "review" ? "primary" : "default"}
                      onClick={() => navigate(() => setToolView("review"))}
                    >
                      复习
                    </Button>
                  </Badge>
                  <Button
                    type={toolView === "progress" ? "primary" : "default"}
                    onClick={() => navigate(() => setToolView("progress"))}
                  >
                    进度
                  </Button>
                </>
              )}
              <SoundToggle />
              <Tooltip title="全局键盘 · 查位置（快捷键 K）">
                <Button onClick={() => setKeyboardOpen(true)}>键盘</Button>
              </Tooltip>
            </Flex>
          </Flex>
        </Header>
        <Content className="bench">
          <ViewTransition
            enter={{ forward: "m101-page-forward", back: "m101-page-back", default: "auto" }}
            exit={{ forward: "m101-page-forward", back: "m101-page-back", default: "auto" }}
          >
          <div key={pageKey} className="page">
          {mode === "tools" ? (
            toolView === "bench" ? (
              <TheoryBench />
            ) : toolView === "diagnostics" ? (
              <DiagnosticsLab />
            ) : toolView === "anchors" ? (
              <MemoryAnchors onOpenLevel={openLevel} />
            ) : toolView === "review" ? (
              <ReviewDeck progress={progress} onProgress={onProgress} onOpenLevel={openLevel} />
            ) : (
              <ProgressBoard
                progress={progress}
                onProgress={onProgress}
                onOpenReview={() => navigate(() => setToolView("review"))}
                onApply={(recipe) => {
                  navigate(() => {
                    setPendingRecipe(recipe);
                    setLevel(recipe.levelId);
                    setMode("learn");
                    setLearnView("lesson");
                  }, "forward");
                }}
              />
            )
          ) : learnView === "lesson" ? (
            stage ? (
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
            )
          ) : (
            <PathMap
              progress={progress}
              onOpenLevel={openLevel}
              onOpenReview={() =>
                navigate(() => {
                  setMode("tools");
                  setToolView("review");
                }, "forward")
              }
            />
          )}
          </div>
          </ViewTransition>
        </Content>
        <SiteFooter />
      </Layout>
      <KeyboardPanel open={keyboardOpen} onClose={() => setKeyboardOpen(false)} />
    </ConfigProvider>
  );
}
