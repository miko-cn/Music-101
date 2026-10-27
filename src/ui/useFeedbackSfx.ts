/**
 * 反馈音效的触发。
 *
 * 关键约束：音效必须在**用户手势的同步链路里**触发。
 *
 * 浏览器的自动播放策略规定 AudioContext 必须在用户手势内 resume。
 * 如果把播音放到 useEffect 里（那是 React 提交后的异步路径），
 * 第一次答题就会因为「没有用户手势」而静音——这正是很多网页
 * 点了按钮没声音的原因。
 *
 * 所以这里返回的是一个普通函数，调用方在 onClick 里直接调，
 * 不经过任何异步跳转。resume() 的 await 是允许的
 * （resume 本身就是解锁动作），但不能先 await 别的东西再播。
 */
import { useCallback } from "react";
import { sharedEngine } from "../core/audio/engine.ts";
import type { SfxCue } from "../core/audio/sfx.ts";
import type { AnswerVerdict } from "../core/lesson/verdict.ts";
import { sfxForVerdict } from "../core/lesson/verdict.ts";
import type { PitchClass } from "../core/theory/pitch.ts";
import type { ScaleId } from "../core/theory/scale.ts";

export function useFeedbackSfx(keyRoot: PitchClass, keyScale: ScaleId) {
  return useCallback(
    (cue: SfxCue) => {
      const active = sharedEngine();
      if (!active) return;
      // 不 await resume：这一行必须在手势的同步链路里跑完。
      void active.resume();
      active.playSfx(cue, { keyRoot, keyScale });
    },
    [keyRoot, keyScale],
  );
}

/** 判定结果直接变成音效。idle 不发声——没作答时响一下是在催人。 */
export function useVerdictSfx(keyRoot: PitchClass, keyScale: ScaleId) {
  const play = useFeedbackSfx(keyRoot, keyScale);
  return useCallback(
    (verdict: AnswerVerdict) => {
      const cue = sfxForVerdict(verdict);
      if (!cue) return;
      play(cue);
    },
    [play],
  );
}
