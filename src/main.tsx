import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import { tokenStylesheet } from "./ui/theme.ts";
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
    <App />
  </StrictMode>,
);
