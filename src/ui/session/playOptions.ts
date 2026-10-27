/**
 * 依次播一组选项（「都听一遍」、盲听题进题自动播）。
 * 返回取消函数：换题、卸载时要把还没响的掐掉，否则会串到下一题。
 */
import { sharedEngine } from "../../core/audio/engine.ts";

/** 两个选项之间隔多久：跟复习页一致，够把前一个听完。 */
export const OPTION_GAP_MS = 900;

export function playOne(midis: readonly number[]): void {
  const active = sharedEngine();
  if (!active) return;
  void active.resume();
  active.playEarOption(midis);
}

export function playInOrder(options: readonly (readonly number[])[]): () => void {
  const active = sharedEngine();
  if (!active) return () => undefined;
  void active.resume();
  const timers: number[] = [];
  options.forEach((midis, index) => {
    if (index === 0) {
      active.playEarOption(midis);
      return;
    }
    timers.push(window.setTimeout(() => active.playEarOption(midis), OPTION_GAP_MS * index));
  });
  return () => {
    for (const id of timers) window.clearTimeout(id);
  };
}
