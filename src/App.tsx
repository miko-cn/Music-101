import { useState } from "react";
import { Button, ConfigProvider, Flex, Layout, theme } from "antd";
import zhCN from "antd/locale/zh_CN";
import { LessonOne } from "./ui/LessonOne.tsx";
import { TheoryBench } from "./ui/TheoryBench.tsx";

const { Header, Content } = Layout;

type View = "bench" | "level1";

export function App() {
  const [view, setView] = useState<View>("level1");

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
              <Button type={view === "level1" ? "primary" : "default"} onClick={() => setView("level1")}>
                第 1 关
              </Button>
            </Flex>
          </Flex>
        </Header>
        <Content className="bench">{view === "bench" ? <TheoryBench /> : <LessonOne />}</Content>
      </Layout>
    </ConfigProvider>
  );
}
