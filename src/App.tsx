import { useState } from "react";
import { Card, Col, ConfigProvider, Flex, Layout, Row, Select, Tag, theme } from "antd";
import zhCN from "antd/locale/zh_CN";
import {
  CHORD_LABELS,
  SCALE_LABELS,
  degreeOfPitch,
  getChordPitches,
  getScalePitches,
  keyName,
  pitchClassToName,
  romanNumeral,
  spellChordTones,
  spellScaleNotes,
  type ChordQuality,
  type PitchClass,
  type ScaleId,
} from "./core/index.ts";

const { Header, Content } = Layout;

const ROOTS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as PitchClass[];
const SCALES: ScaleId[] = ["major", "naturalMinor", "harmonicMinor", "melodicMinor"];
const QUALITIES: ChordQuality[] = ["maj", "min", "maj7", "min7", "add9", "sus4", "dom7"];

const WHITE_KEYS = [0, 2, 4, 5, 7, 9, 11] as PitchClass[];
/** 黑键中心落在第 afterWhite 个白键的右边界上。 */
const BLACK_KEYS: readonly { pitch: PitchClass; afterWhite: number }[] = [
  { pitch: 1, afterWhite: 0 },
  { pitch: 3, afterWhite: 1 },
  { pitch: 6, afterWhite: 3 },
  { pitch: 8, afterWhite: 4 },
  { pitch: 10, afterWhite: 5 },
];

export function App() {
  const [root, setRoot] = useState<PitchClass>(6);
  const [scale, setScale] = useState<ScaleId>("naturalMinor");
  const [quality, setQuality] = useState<ChordQuality>("min");
  const [preferFlat, setPreferFlat] = useState(false);

  const scalePitches = getScalePitches(root, scale);
  const chord = { root, quality };
  const chordPitches = getChordPitches(chord);
  const numeral = romanNumeral(chord, root);
  const scaleNames = spellScaleNotes(root, scale, preferFlat);
  const chordNames = spellChordTones(chord, preferFlat);
  const scaleSet = new Set(scalePitches);
  const chordSet = new Set(chordPitches);
  const tonicName = pitchClassToName(root, preferFlat);
  // 和弦音的拼写优先于音阶：F# 自然小调里的 E 是调内音，F#maj7 的七音仍要写成 E#。
  const spelled = new Map<PitchClass, string>();
  scalePitches.forEach((pitch, index) => {
    const name = scaleNames[index];
    if (name !== undefined) spelled.set(pitch, name);
  });
  chordPitches.forEach((pitch, index) => {
    const name = chordNames[index];
    if (name !== undefined) spelled.set(pitch, name);
  });
  const spell = (pitch: PitchClass) => spelled.get(pitch) ?? pitchClassToName(pitch, preferFlat);

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          fontFamily: 'system-ui, -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif',
          colorBgLayout: "#12121a",
          borderRadius: 10,
        },
      }}
    >
      <Layout className="site">
        <Header className="site-header">
          <Flex align="center" justify="space-between" gap={12} wrap style={{ width: "100%" }}>
            <div>
              <h1 className="site-title">Music-101</h1>
              <p className="site-subtitle">kawaii bass / future bass 编曲速成</p>
            </div>
            <Tag>乐理工作台</Tag>
          </Flex>
        </Header>
        <Content className="bench">
          <p className="lead">
            先选定调、音阶和和弦性质。下面给出这个调的七个音、和弦的罗马数字级数，以及这些音在键盘上的位置。点琴键可以换调。
          </p>

          <Card title="选择">
            <Flex wrap gap={16} align="flex-end">
              <div className="field">
                <label htmlFor="key-root">调</label>
                <Select<PitchClass>
                  id="key-root"
                  size="large"
                  value={root}
                  style={{ minWidth: 112 }}
                  onChange={setRoot}
                  options={ROOTS.map((pitch) => ({
                    value: pitch,
                    label: pitchClassToName(pitch, preferFlat),
                  }))}
                />
              </div>
              <div className="field">
                <label htmlFor="key-scale">音阶</label>
                <Select<ScaleId>
                  id="key-scale"
                  size="large"
                  value={scale}
                  style={{ minWidth: 168 }}
                  onChange={setScale}
                  options={SCALES.map((item) => ({ value: item, label: SCALE_LABELS[item] }))}
                />
              </div>
              <div className="field">
                <label htmlFor="key-quality">和弦性质</label>
                <Select<ChordQuality>
                  id="key-quality"
                  size="large"
                  value={quality}
                  style={{ minWidth: 200 }}
                  onChange={setQuality}
                  options={QUALITIES.map((item) => ({
                    value: item,
                    label: `${CHORD_LABELS[item]} · ${item}`,
                  }))}
                />
              </div>
              <div className="field">
                <label htmlFor="key-spelling">记谱</label>
                <Select<"sharp" | "flat">
                  id="key-spelling"
                  size="large"
                  value={preferFlat ? "flat" : "sharp"}
                  style={{ minWidth: 120 }}
                  onChange={(value) => setPreferFlat(value === "flat")}
                  options={[
                    { value: "sharp", label: "升号" },
                    { value: "flat", label: "降号" },
                  ]}
                />
              </div>
            </Flex>
          </Card>

          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <Card title="调内音" className="result-card">
                <h2 className="result-heading">{keyName(root, scale, preferFlat)}</h2>
                <ol className="degree-list">
                  {scalePitches.map((pitch, index) => (
                    <li key={`${index}-${pitch}`}>
                      <span className="degree-index">{index + 1}</span>
                      <span>{scaleNames[index]}</span>
                    </li>
                  ))}
                </ol>
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="和弦与级数" className="result-card">
                <p className="chord-symbol">
                  {tonicName}
                  {quality} → {numeral}
                </p>
                <p className="numeral-label">级数</p>
                <p className="numeral">{numeral}</p>
                <p className="quality-label">{CHORD_LABELS[quality]}</p>
                <Flex wrap gap={8}>
                  {chordPitches.map((pitch, index) => {
                    const degree = degreeOfPitch(pitch, root, scale);
                    return (
                      <Tag key={`${index}-${pitch}`} color={degree === null ? "gold" : "blue"}>
                        {chordNames[index]}
                        {degree === null ? " · 调外" : ` · ${degree} 级`}
                      </Tag>
                    );
                  })}
                </Flex>
                <p className="hint">
                  级数按这个调的平行大调来记。大三和弦用大写，小三和弦用小写，减三和弦加 °。
                </p>
              </Card>
            </Col>
          </Row>

          <Card title="键盘">
            <div className="piano" role="group" aria-label="一个八度的键盘，点击换调">
              {WHITE_KEYS.map((pitch) => (
                <KeyButton
                  key={pitch}
                  pitch={pitch}
                  kind="white"
                  name={spell(pitch)}
                  isRoot={pitch === root}
                  inScale={scaleSet.has(pitch)}
                  inChord={chordSet.has(pitch)}
                  onPick={setRoot}
                />
              ))}
              {BLACK_KEYS.map((key) => (
                <KeyButton
                  key={key.pitch}
                  pitch={key.pitch}
                  kind="black"
                  name={spell(key.pitch)}
                  isRoot={key.pitch === root}
                  inScale={scaleSet.has(key.pitch)}
                  inChord={chordSet.has(key.pitch)}
                  onPick={setRoot}
                  style={{
                    left: `${((key.afterWhite + 1 - 0.29) / WHITE_KEYS.length) * 100}%`,
                    width: `${(0.58 / WHITE_KEYS.length) * 100}%`,
                  }}
                />
              ))}
            </div>
            <ul className="piano-legend">
              <li>
                <i className="swatch swatch-chord" />
                填色是和弦音
              </li>
              <li>
                <i className="swatch swatch-scale" />
                底部色条是调内音
              </li>
              <li>
                <i className="swatch swatch-root" />
                黄框是当前主音
              </li>
            </ul>
          </Card>
        </Content>
      </Layout>
    </ConfigProvider>
  );
}

function KeyButton({
  pitch,
  kind,
  name,
  isRoot,
  inScale,
  inChord,
  onPick,
  style,
}: {
  pitch: PitchClass;
  kind: "white" | "black";
  name: string;
  isRoot: boolean;
  inScale: boolean;
  inChord: boolean;
  onPick: (pitch: PitchClass) => void;
  style?: { left: string; width: string };
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
      aria-label={`${name}，${isRoot ? "当前主音，" : ""}${role}`}
      style={style}
      onClick={() => onPick(pitch)}
    >
      <span>{name}</span>
    </button>
  );
}
