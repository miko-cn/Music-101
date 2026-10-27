/**
 * 答题会话的键盘：1–9 选项，Enter 检查 / 继续，Space 重播。
 *
 * 在 window 上监听，自己处理的键一律 preventDefault——
 * 焦点停在按钮上时，浏览器会把 Space / Enter 当成再点一次。
 * 跟弹琴键（A S D F G H J / W E T Y U / Z X）和全局 K 不冲突。
 */
import { useEffect, useRef } from "react";
import { isTypingTarget } from "../../core/lesson/keyboard.ts";

export interface SessionKeyHandlers {
  onDigit: (digit: number) => void;
  onEnter: () => void;
  onSpace: () => void;
}

export function useSessionKeys(enabled: boolean, handlers: SessionKeyHandlers): void {
  // 处理函数每次渲染都换新，用 ref 拿最新的，监听器只装一次。
  const latest = useRef(handlers);
  latest.current = handlers;

  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return;
      if (isTypingTarget(event.target)) return;
      if (/^[1-9]$/.test(event.key)) {
        event.preventDefault();
        latest.current.onDigit(Number(event.key));
      } else if (event.key === "Enter") {
        event.preventDefault();
        latest.current.onEnter();
      } else if (event.key === " ") {
        event.preventDefault();
        latest.current.onSpace();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled]);
}
