import { useMemo, useState } from "react";
import { Alert, Card, Flex, Select } from "antd";
import { energySeries, isChorusName, isVerseName, sectionBars, type BarEnergy } from "../core/analyze/energy.ts";
import type { AnalysisSong } from "../core/analyze/song.ts";
import { diagnoseArrangement } from "../core/analyze/rules/index.ts";
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

export function DiagnosticsLab() {
  const [exampleId, setExampleId] = useState("lift-fail");
  const example = EXAMPLES.find((item) => item.id === exampleId) ?? EXAMPLES[0];
  const song = useMemo(() => example?.song() ?? chorusFlatSong(), [example]);
  const series = useMemo(() => energySeries(song), [song]);
  const diagnostics = useMemo(() => diagnoseArrangement(song), [song]);

  return (
    <>
      <p className="lead">
        这六条规则看的是构造出来的小样例，用来核对判定落在哪一小节。第 1 关自己的音高和格子规则还在关卡里面，不混在这里。
      </p>
      <Card title="样例">
        <div className="field">
          <label htmlFor="diagnostic-example">看哪一个</label>
          <Select
            id="diagnostic-example"
            size="large"
            value={exampleId}
            style={{ minWidth: 240 }}
            onChange={setExampleId}
            options={EXAMPLES.map((item) => ({ value: item.id, label: item.label }))}
          />
        </div>
      </Card>
      <Card title="能量曲线">
        <EnergyChart song={song} series={series} />
      </Card>
      <Card title="诊断">
        <Flex vertical gap={12}>
          {diagnostics.length === 0 ? (
            <Alert type="success" message="这六条规则都没有意见。" />
          ) : (
            diagnostics.map((item) => (
              <Alert
                key={item.id}
                type={item.severity === "error" ? "error" : item.severity === "warning" ? "warning" : "info"}
                message={diagnosticText(item)}
              />
            ))
          )}
        </Flex>
      </Card>
    </>
  );
}

function diagnosticText(item: { bar?: number; message: string }): string {
  if (item.bar === undefined) return item.message;
  const label = `第 ${item.bar + 1} 小节`;
  if (item.message.includes(label)) return item.message;
  return `${label} · ${item.message}`;
}

function EnergyChart({ song, series }: { song: AnalysisSong; series: BarEnergy[] }) {
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
