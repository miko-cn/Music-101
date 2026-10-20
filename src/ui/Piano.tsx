import type { CSSProperties } from "react";
import type { PitchClass } from "../core/theory/pitch.ts";

const WHITE_KEYS = [0, 2, 4, 5, 7, 9, 11] as PitchClass[];
/** 黑键中心落在第 afterWhite 个白键的右边界上。 */
const BLACK_KEYS: readonly { pitch: PitchClass; afterWhite: number }[] = [
  { pitch: 1, afterWhite: 0 },
  { pitch: 3, afterWhite: 1 },
  { pitch: 6, afterWhite: 3 },
  { pitch: 8, afterWhite: 4 },
  { pitch: 10, afterWhite: 5 },
];

export function Piano({
  spell,
  isRoot,
  inScale,
  inChord,
  onPick,
  label = "一个八度的键盘",
  rootWord = "当前主音",
}: {
  spell: (pitch: PitchClass) => string;
  isRoot: (pitch: PitchClass) => boolean;
  inScale: (pitch: PitchClass) => boolean;
  inChord: (pitch: PitchClass) => boolean;
  onPick: (pitch: PitchClass) => void;
  label?: string;
  rootWord?: string;
}) {
  return (
    <div className="piano" role="group" aria-label={label}>
      {WHITE_KEYS.map((pitch) => (
        <KeyButton
          key={pitch}
          kind="white"
          name={spell(pitch)}
          isRoot={isRoot(pitch)}
          inScale={inScale(pitch)}
          inChord={inChord(pitch)}
          rootWord={rootWord}
          onPick={() => onPick(pitch)}
        />
      ))}
      {BLACK_KEYS.map((key) => (
        <KeyButton
          key={key.pitch}
          kind="black"
          name={spell(key.pitch)}
          isRoot={isRoot(key.pitch)}
          inScale={inScale(key.pitch)}
          inChord={inChord(key.pitch)}
          rootWord={rootWord}
          onPick={() => onPick(key.pitch)}
          style={{
            left: `${((key.afterWhite + 1 - 0.29) / WHITE_KEYS.length) * 100}%`,
            width: `${(0.58 / WHITE_KEYS.length) * 100}%`,
          }}
        />
      ))}
    </div>
  );
}

function KeyButton({
  kind,
  name,
  isRoot,
  inScale,
  inChord,
  rootWord,
  onPick,
  style,
}: {
  kind: "white" | "black";
  name: string;
  isRoot: boolean;
  inScale: boolean;
  inChord: boolean;
  rootWord: string;
  onPick: () => void;
  style?: CSSProperties;
}) {
  const role = inChord ? "和弦音" : inScale ? "调内音" : "调外音";
  return (
    <button
      type="button"
      className={[
        "piano-key",
        kind === "white" ? "piano-white" : "piano-black",
        inScale ? "is-scale" : "",
        inChord ? "is-chord" : "",
        isRoot ? "is-root" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-pressed={isRoot}
      aria-label={`${name}，${isRoot ? `${rootWord}，` : ""}${role}`}
      style={style}
      onClick={onPick}
    >
      <span>{name}</span>
    </button>
  );
}
