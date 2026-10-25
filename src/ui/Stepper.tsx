import { Select } from "antd";
import { resizeSteps, stepCount, toggleStep, type BarCount } from "../core/sequencer/grid.ts";

export function Stepper({
  steps,
  bars,
  onSteps,
  onBars,
  lockBars = false,
  label = "16 格步进器",
}: {
  steps: boolean[];
  bars: BarCount;
  onSteps: (steps: boolean[]) => void;
  onBars: (bars: BarCount) => void;
  lockBars?: boolean;
  label?: string;
}) {
  const visible = steps.slice(0, stepCount(bars));
  return (
    <div>
      {lockBars ? null : (
      <div className="field stepper-view">
        <label htmlFor="step-bars">视图</label>
        <Select<BarCount>
          id="step-bars"
          value={bars}
          style={{ width: 140 }}
          onChange={(value) => {
            onBars(value);
            onSteps(resizeSteps(steps, value));
          }}
          options={[
            { value: 1, label: "1 小节" },
            { value: 2, label: "2 小节" },
            { value: 4, label: "4 小节" },
          ]}
        />
      </div>
      )}
      <div className="stepper" role="group" aria-label={label}>
        {visible.map((on, index) => (
          <button
            key={index}
            type="button"
            className={["step", on ? "on" : "", index % 4 === 0 ? "beat" : ""].filter(Boolean).join(" ")}
            aria-pressed={on}
            aria-label={`第 ${index + 1} 格`}
            onClick={() => onSteps(toggleStep(steps, index))}
          >
            {index + 1}
          </button>
        ))}
      </div>
    </div>
  );
}
