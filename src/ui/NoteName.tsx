import { splitNoteName } from "../core/theory/notation.ts";

/**
 * 音名的记谱显示。
 *
 * 字母用衬线体（跟正文的无衬线拉开），变音记号用 Noto Music 记谱字体，
 * 八度数字做成下标——这是谱面的写法，不是正文的写法。
 *
 * 渲染出来是 "C♯4" 这样一个整体，但结构是分开的：
 * 字母、变音记号、八度各有各的排版规则。
 */
export function NoteName({ name, className }: { name: string; className?: string }) {
  const { letter, accidental, octave } = splitNoteName(name);
  return (
    <span className={className ? `note-name ${className}` : "note-name"}>
      {letter}
      {accidental ? <span className="note-accidental">{accidental}</span> : null}
      {octave ? <span className="note-octave">{octave}</span> : null}
    </span>
  );
}
