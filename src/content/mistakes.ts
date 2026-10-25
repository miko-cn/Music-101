/**
 * 错误类型的中文说法。
 *
 * 类型本身在 core/lesson/mistakes.ts（那边不能反过来依赖 content），
 * 显示用的文字放在这边——内容归内容，规则归规则。
 */
import type { MistakeKind } from "../core/lesson/mistakes.ts";

/** 进度页和提示条上显示的短名字。 */
export const MISTAKE_LABEL: Record<MistakeKind, string> = {
  "same-progression": "同一条进行",
  "chorus-flat": "副歌不抬层",
  "low-end-clash": "808 抢 kick",
};

/** 错误现象的一句话描述。 */
export const MISTAKE_SUMMARY: Record<MistakeKind, string> = {
  "same-progression": "同一条大调进行已经出现了两次以上。",
  "chorus-flat": "副歌有两次以上没有抬层。",
  "low-end-clash": "808 有两次以上压进 kick 的音区。",
};
