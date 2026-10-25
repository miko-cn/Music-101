import { sharedEngine } from "../audio/engine.ts";
import { attachComputerKeyboard, createComputerKeyboardService } from "./keyboard.ts";

/**
 * 全站唯一的电脑键盘。
 *
 * 电脑键只有一处实现：这里负责起音和制音，
 * 关卡页和全局键盘面板都只是订阅者（谁点亮、谁选中音高）。
 *
 * 为什么不各自接一遍：
 * 同一个键被接两次，声音会叠两遍，琴键也会亮两遍；
 * 而且关卡页和全局键盘的八度会各走各的。
 */
export const computerKeyboard = createComputerKeyboardService({
  attach: (host) => attachComputerKeyboard(host),
  getEngine: () => sharedEngine(),
});
