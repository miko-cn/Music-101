import { useRef, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { midiToNoteName } from "../core/theory/pitch.ts";
import { toNotationName } from "../core/theory/notation.ts";
import { centeredKeyboardLayout } from "../core/theory/keyboard.ts";
import { NoteName } from "./NoteName.tsx";

export interface KeyboardProps {
  /** 中央 C 的 MIDI 音高（60）。布局以它为中心向左右展开。 */
  centerMidi?: number;
  /** 显示几个八度。 */
  octaves?: number;
  /** 是否在琴键上印音名。 */
  showNames?: boolean;
  /** 是否在琴键上印 MIDI 编号。 */
  showMidi?: boolean;
  /** 是否标出「2 个 / 3 个」的黑键分组，以及 C、F 的定位点。 */
  showGroups?: boolean;
  /** 需要高亮的音类集合（0–11）。 */
  highlight?: ReadonlySet<number>;
  /** 需要高亮的精确 MIDI 音高集合（比音类高亮更强）。 */
  highlightMidi?: ReadonlySet<number>;
  /** 按下琴键时回调，参数是 MIDI 音高。 */
  onPress?: (midi: number) => void;
  /** 松开琴键时回调，参数是 MIDI 音高。 */
  onRelease?: (midi: number) => void;
  /** 已经按下的音高集合。 */
  pressed?: ReadonlySet<number>;
  label?: string;
}

/**
 * 多八度参考键盘。
 *
 * 与关卡里那个单八度 Piano 不同，这个是「查位置」用的：
 * - 以中央 C 为中心向左右展开，C4 永远在正中间，打开就能当尺子用
 * - 跨多个八度，才能看出「黑键 2 个一组、3 个一组」在重复
 * - 每个键都印音名（黑键也印）
 * - 可以标出 C 和 F 这两个定位点
 *
 * 发声跟住手指：按下起音，松开制音，延音多长由你按多久决定。
 */
export function Keyboard({
  centerMidi = 60,
  octaves = 3,
  showNames = true,
  showMidi = false,
  showGroups = true,
  highlight,
  highlightMidi,
  onPress,
  onRelease,
  pressed,
  label = "参考键盘",
}: KeyboardProps) {
  const { white, black, whiteCount, cIndexes, fIndexes, groups } = centeredKeyboardLayout(
    centerMidi,
    octaves,
  );
  const whiteWidth = 100 / whiteCount;
  const blackWidth = (0.58 / whiteCount) * 100;

  return (
    <div className="keyboard-wrap">
      {showGroups && (
        <div className="keyboard-groups" aria-hidden="true">
          {groups.map((group) => (
            <span
              key={`${group.fromWhite}-${group.toWhite}`}
              className="keyboard-group"
              style={{
                left: `${((group.fromWhite + 1 - 0.29) / whiteCount) * 100}%`,
                width: `${((group.toWhite - group.fromWhite + 0.58) / whiteCount) * 100}%`,
              }}
            >
              {group.size} 个
            </span>
          ))}
        </div>
      )}
      <div className="keyboard" role="group" aria-label={label}>
        {white.map((key) => (
          <KeyButton
            key={key.midi}
            kind="white"
            midi={key.midi}
            showNames={showNames}
            showMidi={showMidi}
            highlighted={highlight?.has(key.midi % 12) === true}
            exact={highlightMidi?.has(key.midi) === true}
            pressed={pressed?.has(key.midi) === true}
            onPress={onPress}
            onRelease={onRelease}
          />
        ))}
        {black.map((key) => (
          <KeyButton
            key={key.midi}
            kind="black"
            midi={key.midi}
            showNames={showNames}
            showMidi={showMidi}
            highlighted={highlight?.has(key.midi % 12) === true}
            exact={highlightMidi?.has(key.midi) === true}
            pressed={pressed?.has(key.midi) === true}
            onPress={onPress}
            onRelease={onRelease}
            style={{
              left: `${((key.whiteIndex + 1 - 0.29) / whiteCount) * 100}%`,
              width: `${blackWidth}%`,
            }}
          />
        ))}
      </div>
      {showGroups && (
        <div className="keyboard-anchors" aria-hidden="true">
          {cIndexes.map((index) => (
            <span
              key={`c-${index}`}
              className="keyboard-anchor"
              style={{ left: `${index * whiteWidth}%`, width: `${whiteWidth}%` }}
            >
              C
            </span>
          ))}
          {fIndexes.map((index) => (
            <span
              key={`f-${index}`}
              className="keyboard-anchor"
              style={{ left: `${index * whiteWidth}%`, width: `${whiteWidth}%` }}
            >
              F
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function KeyButton({
  kind,
  midi,
  showNames,
  showMidi,
  highlighted,
  exact,
  pressed,
  onPress,
  onRelease,
  style,
}: {
  kind: "white" | "black";
  midi: number;
  showNames: boolean;
  showMidi: boolean;
  highlighted: boolean;
  exact: boolean;
  pressed: boolean;
  onPress?: (midi: number) => void;
  onRelease?: (midi: number) => void;
  style?: CSSProperties;
}) {
  const name = midiToNoteName(midi);
  // 黑键有两种拼法：C♯ 和 D♭ 是同一个键。初学者最常混的就是这个，
  // 所以两个都印出来——上面是升号拼法（键盘默认），下面是降号拼法。
  const altName = kind === "black" ? midiToNoteName(midi, true) : null;
  // 指针按下的时刻。用它区分「鼠标点的」和「键盘 Enter 触发的」——
  // 鼠标那一下已经在 pointerdown 里起音了，click 不该再响一次。
  const pointerAt = useRef(0);

  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    pointerAt.current = Date.now();
    // 抓住指针：手指滑出琴键也不会漏掉「松开」，延音才跟得住。
    event.currentTarget.setPointerCapture?.(event.pointerId);
    onPress?.(midi);
  };

  const ariaLabel = altName
    ? `${toNotationName(name)} 或 ${toNotationName(altName)}`
    : toNotationName(name);

  return (
    <button
      type="button"
      className={[
        "keyboard-key",
        kind === "white" ? "keyboard-white" : "keyboard-black",
        highlighted ? "is-highlight" : "",
        exact ? "is-highlight-exact" : "",
        pressed ? "is-pressed" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={`${ariaLabel}${showMidi ? `，MIDI ${midi}` : ""}`}
      style={style}
      onPointerDown={handlePointerDown}
      onPointerUp={() => onRelease?.(midi)}
      onPointerCancel={() => onRelease?.(midi)}
      onLostPointerCapture={() => onRelease?.(midi)}
      onClick={() => {
        // 键盘（Enter / 空格）触发时没有 pointerdown，这里补一声短音。
        if (Date.now() - pointerAt.current < 800) return;
        onPress?.(midi);
        window.setTimeout(() => onRelease?.(midi), 200);
      }}
    >
      {showNames ? (
        <>
          <NoteName name={name} className="keyboard-key-name" />
          {altName ? <NoteName name={altName} className="keyboard-key-name is-alt" /> : null}
        </>
      ) : null}
      {showMidi ? <span className="keyboard-key-midi">{midi}</span> : null}
    </button>
  );
}
