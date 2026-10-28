import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { LazyMotion, MotionConfig, domAnimation } from "motion/react";
import { App } from "./App.tsx";
import { springs, tokenStylesheet } from "./ui/theme.ts";
import "./styles.css";
import "./ui/motion.css";

/**
 * 把设计 token 注入成 CSS 变量。
 *
 * 放在这里而不是让 CSS 自己写一份，是为了保证 antd 主题和 CSS 变量
 * 读的是同一个常量来源——见 ui/theme.ts 的说明。
 */
const tokenStyle = document.createElement("style");
tokenStyle.textContent = tokenStylesheet();
document.head.appendChild(tokenStyle);

const container = document.getElementById("root");
if (!container) throw new Error("找不到 #root 挂载点");

createRoot(container).render(
  <StrictMode>
    {/* reducedMotion="user"：CSS 那条全局降级管不到 Motion 的 JS 动画，这里单独接住。 */}
    <MotionConfig reducedMotion="user" transition={springs.base}>
      <LazyMotion features={domAnimation} strict>
        <App />
      </LazyMotion>
    </MotionConfig>
  </StrictMode>,
);
