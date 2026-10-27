/**
 * 顶栏的声音开关。
 *
 * 放在 learn / tools 两种模式共有的位置：放进 learn 分支的话，
 * 复习页和工具页里反馈音照响，开关却不见了。
 * 只管反馈音：听辨题的声音是内容，静音不该让题目没法做。
 */
import { Button, Flex, Popover, Slider, Switch } from "antd";
import { setSoundPrefs, useSoundPrefs } from "./soundPrefs.ts";
import { playFeedbackSfx } from "./useFeedbackSfx.ts";

export function SoundToggle() {
  const prefs = useSoundPrefs();
  const content = (
    <Flex vertical gap={12} style={{ width: 200 }}>
      <Flex align="center" justify="space-between">
        <span>反馈音静音</span>
        <Switch
          size="small"
          aria-label="反馈音静音"
          checked={prefs.sfxMuted}
          onChange={(sfxMuted) => setSoundPrefs({ ...prefs, sfxMuted })}
        />
      </Flex>
      <div>
        <span className="hint">反馈音音量</span>
        <Slider
          min={0}
          max={100}
          ariaLabelForHandle="反馈音音量"
          value={Math.round(prefs.sfxVolume * 100)}
          disabled={prefs.sfxMuted}
          onChange={(value) => setSoundPrefs({ ...prefs, sfxVolume: value / 100 })}
          // 松手时响一声，让人听见现在多大声。拖动途中不响，否则一串叠在一起。
          onChangeComplete={() => playFeedbackSfx("correct")}
        />
      </div>
      <p className="hint">只管提示音。听辨题和琴键的声音不受影响。</p>
    </Flex>
  );
  // 不套 antd Tooltip：顶栏贴着视口顶，Tooltip 会翻到按钮下方，正好盖住弹层里的静音开关。
  return (
    <Popover content={content} trigger="click" placement="bottomRight">
      <Button
        title="反馈音"
        aria-pressed={prefs.sfxMuted}
        aria-label={prefs.sfxMuted ? "反馈音已静音" : "反馈音设置"}
      >
        {prefs.sfxMuted ? "🔇" : "🔊"}
      </Button>
    </Popover>
  );
}
