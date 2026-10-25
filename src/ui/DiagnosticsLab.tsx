import { useMemo, useState } from "react";
import { Alert, Button, Card, Flex, Select } from "antd";
import { energySeries, isChorusName, isVerseName, sectionBars, type BarEnergy } from "../core/analyze/energy.ts";
import type { AnalysisSong } from "../core/analyze/song.ts";
import { diagnoseArrangement } from "../core/analyze/rules/index.ts";
import { importMidi, type ImportedMidi } from "../core/midi/importSong.ts";
import { readMidiFile } from "../core/midi/reader.ts";
import type { MidiFile } from "../core/midi/types.ts";
import { pitchClassToName, type PitchClass } from "../core/theory/pitch.ts";
import { toNotationName } from "../core/theory/notation.ts";
import { SCALE_LABELS, type ScaleId } from "../core/theory/scale.ts";
import {
  chorusFlatSong,
  chorusLiftedSong,
  freshColorSong,
  lowEndClashSong,
  midClashSong,
  outOfKeySong,
  repeatedColorSong,
  separatedSpectrumSong,
  staleSong,
} from "../core/analyze/fixtures.ts";

const EXAMPLES: { id: string; label: string; song: () => AnalysisSong }[] = [
  { id: "lift-fail", label: "副歌没抬层", song: chorusFlatSong },
  { id: "lift-ok", label: "副歌抬起来了", song: chorusLiftedSong },
  { id: "harmony", label: "调外音", song: outOfKeySong },
  { id: "low-end", label: "808 撞 kick", song: lowEndClashSong },
  { id: "spectrum", label: "中频挤在一起", song: midClashSong },
  { id: "spectrum-ok", label: "频段分开", song: separatedSpectrumSong },
  { id: "stale", label: "和声重复到没新鲜感", song: staleSong },
  { id: "color", label: "相邻小节色彩重复", song: repeatedColorSong },
  { id: "color-ok", label: "换了一个和弦", song: freshColorSong },
];

const KEYS = Array.from({ length: 12 }, (_, pitch) => pitch as PitchClass);
const SCALES: ScaleId[] = ["major", "naturalMinor"];

export function DiagnosticsLab() {
  const [exampleId, setExampleId] = useState("lift-fail");
  const [midi, setMidi] = useState<MidiFile | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [keyRoot, setKeyRoot] = useState<PitchClass>(0);
  const [keyScale, setKeyScale] = useState<ScaleId>("major");
  const example = EXAMPLES.find((item) => item.id === exampleId) ?? EXAMPLES[0];
  const imported = useMemo(
    () => (midi ? importMidi(midi, { keyRoot, keyScale }) : null),
    [midi, keyRoot, keyScale],
  );
  const exampleSong = useMemo(() => example?.song() ?? chorusFlatSong(), [example]);
  const song = imported?.song ?? exampleSong;
  const series = useMemo(() => energySeries(song), [song]);
  const diagnostics = useMemo(() => diagnoseArrangement(song), [song]);

  const loadFile = async (file: File) => {
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const parsed = readMidiFile(bytes);
      setMidi(parsed);
      setFileName(file.name);
      setFileError(null);
    } catch (error) {
      setMidi(null);
      setFileName(file.name);
      setFileError(error instanceof Error ? error.message : "这个文件读不了。");
    }
  };

  return (
    <>
      <p className="lead">
        这六条规则看的是构造出来的小样例，也可以打开一份本地 MIDI。第 1 关自己的音高和格子规则还在关卡里面，不混在这里。
      </p>
      <Card title="MIDI 文件">
        <Flex vertical gap={12}>
          <label className="hint">
            打开本地 .mid
            <input
              aria-label="打开本地 MIDI"
              type="file"
              accept=".mid,audio/midi"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void loadFile(file);
              }}
            />
          </label>
          {fileError ? <Alert type="error" showIcon title={fileError} /> : null}
          {imported && fileName ? <MidiSummary imported={imported} fileName={fileName} /> : null}
          {imported ? (
            <Flex gap={12} wrap>
              <div className="field">
                <label htmlFor="diagnostic-key">和声用的调</label>
                <Select
                  id="diagnostic-key"
                  value={keyRoot}
                  style={{ minWidth: 120 }}
                  onChange={setKeyRoot}
                  options={KEYS.map((pitch) => ({
                    value: pitch,
                    label: toNotationName(pitchClassToName(pitch)),
                  }))}
                />
              </div>
              <div className="field">
                <label htmlFor="diagnostic-scale">音阶</label>
                <Select
                  id="diagnostic-scale"
                  value={keyScale}
                  style={{ minWidth: 140 }}
                  onChange={setKeyScale}
                  options={SCALES.map((scale) => ({ value: scale, label: SCALE_LABELS[scale] }))}
                />
              </div>
            </Flex>
          ) : null}
        </Flex>
      </Card>
      <Card title="样例">
        <div className="field">
          <label htmlFor="diagnostic-example">看哪一个</label>
          <Select
            id="diagnostic-example"
            size="large"
            value={exampleId}
            disabled={imported !== null}
            style={{ minWidth: 240 }}
            onChange={setExampleId}
            options={EXAMPLES.map((item) => ({ value: item.id, label: item.label }))}
          />
        </div>
        {imported ? (
          <Button
            onClick={() => {
              setMidi(null);
              setFileName(null);
              setFileError(null);
            }}
          >
            回到样例
          </Button>
        ) : null}
      </Card>
      <Card title="能量曲线">
        <EnergyChart song={song} series={series} />
      </Card>
      <Card title="诊断">
        <Flex vertical gap={12}>
          {diagnostics.length === 0 ? (
            <Alert type="success" title="这六条规则都没有意见。" />
          ) : (
            diagnostics.map((item) => (
              <Alert
                key={item.id}
                type={item.severity === "error" ? "error" : item.severity === "warning" ? "warning" : "info"}
                title={diagnosticText(item)}
              />
            ))
          )}
        </Flex>
      </Card>
    </>
  );
}

function MidiSummary({ imported, fileName }: { imported: ImportedMidi; fileName: string }) {
  const tempo = imported.bpm === null ? "没有速度" : `${imported.bpm} BPM`;
  const meter = imported.timeSignature
    ? `${imported.timeSignature.numerator}/${imported.timeSignature.denominator}`
    : "没有拍号，按 4/4";
  return (
    <Flex vertical gap={8}>
      <p className="lead">
        {fileName} · {tempo} · {meter} · {imported.song.totalBars} 小节
      </p>
      <p className="hint">
        轨：
        {imported.tracks.length === 0
          ? "没有"
          : imported.tracks.map((track) => `${track.name}${track.notes > 0 ? ` ${track.notes} 音` : " 无音符"}`).join("、")}
      </p>
      <p className="hint">
        标记：
        {imported.markers.length === 0
          ? "没有"
          : imported.markers.map((marker) => `${marker.text} 第 ${marker.bar + 1} 小节`).join("、")}
      </p>
      {imported.gaps.map((line) => (
        <p key={line} className="hint">
          {line}
        </p>
      ))}
    </Flex>
  );
}

function diagnosticText(item: { bar?: number; message: string }): string {
  if (item.bar === undefined) return item.message;
  const label = `第 ${item.bar + 1} 小节`;
  if (item.message.includes(label)) return item.message;
  return `${label} · ${item.message}`;
}

export function EnergyChart({ song, series }: { song: AnalysisSong; series: BarEnergy[] }) {
  const width = 640;
  const height = 220;
  const pad = 28;
  const maxEnergy = Math.max(1, ...series.map((item) => item.energy));
  const xOf = (bar: number) => pad + (bar / Math.max(series.length - 1, 1)) * (width - pad * 2);
  const yOf = (energy: number) => height - pad - (energy / maxEnergy) * (height - pad * 2);
  const points = series.map((item) => `${xOf(item.bar)},${yOf(item.energy)}`).join(" ");
  const verse = new Set(sectionBars(song, isVerseName));
  const chorus = new Set(sectionBars(song, isChorusName));

  return (
    <svg className="energy-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="每小节能量折线">
      {series.map((item) => (
        <rect
          key={`band-${item.bar}`}
          x={xOf(item.bar) - 8}
          y={pad}
          width={16}
          height={height - pad * 2}
          fill={chorus.has(item.bar) ? "rgba(22,119,255,0.18)" : verse.has(item.bar) ? "rgba(255,255,255,0.04)" : "transparent"}
        />
      ))}
      <polyline points={points} fill="none" stroke="#69b1ff" strokeWidth="3" />
      {series.map((item) => (
        <g key={item.bar}>
          <circle cx={xOf(item.bar)} cy={yOf(item.energy)} r="4" fill="#1677ff" />
          <text x={xOf(item.bar)} y={height - 8} textAnchor="middle" fill="rgba(255,255,255,0.65)" fontSize="12">
            {item.bar + 1}
          </text>
        </g>
      ))}
    </svg>
  );
}
