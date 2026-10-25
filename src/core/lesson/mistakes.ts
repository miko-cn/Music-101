/**
 * 错误类型。
 *
 * 单独一个文件、且不 import 任何东西——
 * 关卡内容（content）要引用这个类型，
 * 而 core/lesson/personalize 又要从 content 取关卡数据，
 * 不隔离的话两边会绕成循环依赖。
 *
 * 显示用的中文说法在 content/mistakes.ts：内容归内容，规则归规则。
 */
export const MISTAKE_KINDS = ["same-progression", "chorus-flat", "low-end-clash"] as const;

export type MistakeKind = (typeof MISTAKE_KINDS)[number];
