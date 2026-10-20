import { useState } from "react";
import { Button, ConfigProvider, Flex, Layout, Select, theme } from "antd";
import zhCN from "antd/locale/zh_CN";
import { STAGE_LESSONS } from "./content/stage1.ts";
import { DiagnosticsLab } from "./ui/DiagnosticsLab.tsx";
import { LessonFlow } from "./ui/LessonFlow.tsx";
import { LessonOne } from "./ui/LessonOne.tsx";
import { TheoryBench } from "./ui/TheoryBench.tsx";

const { Header, Content } = Layout;

type View = "bench" | "lesson" | "diagnostics";

const LESSON_OPTIONS = [
  { value: 1, label: "第 1 关 · 音高与键盘" },
  ...STAGE_LESSONS.map((lesson) => ({ value: lesson.id, label: `第 ${lesson.id} 关 · ${lesson.title}` })),
];

export function App() {
  const [view, setView] = useState<View>("lesson");
  const [level, setLevel] = useState(1);
  const stage = STAGE_LESSONS.find((lesson) => lesson.id === level);

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
              <Select
                aria-label="关卡"
                value={view === "lesson" ? level : undefined}
                placeholder="关卡"
                style={{ minWidth: 220 }}
                options={LESSON_OPTIONS}
                onChange={(value) => {
                  setLevel(value);
                  setView("lesson");
                }}
              />
              <Button type={view === "diagnostics" ? "primary" : "default"} onClick={() => setView("diagnostics")}>
                诊断
              </Button>
            </Flex>
          </Flex>
        </Header>
        <Content className="bench">
          {view === "bench" ? (
            <TheoryBench />
          ) : view === "diagnostics" ? (
            <DiagnosticsLab />
          ) : level === 1 || !stage ? (
            <LessonOne />
          ) : (
            <LessonFlow lesson={stage} />
          )}
        </Content>
      </Layout>
    </ConfigProvider>
  );
}
