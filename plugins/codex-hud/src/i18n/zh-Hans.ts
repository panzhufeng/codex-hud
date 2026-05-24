import type { Messages } from "./types.js";

export const zhHans: Messages = {
  // Labels
  "label.context": "上下文",
  "label.usage": "用量",
  "label.weekly": "本周",
  "label.approxRam": "内存",
  "label.promptCache": "缓存",
  "label.rules": "规则",
  "label.hooks": "钩子",
  "label.estimatedCost": "估算",
  "label.cost": "费用",
  "label.tokens": "令牌",
  "label.sessionStarted": "开始",
  "label.lastReply": "上次回复",

  // Status
  "status.limitReached": "已达上限",
  "status.allTodosComplete": "全部完成",
  "status.expired": "已过期",

  // Format
  "format.resets": "重置于",
  "format.resetsIn": "重置剩余",
  "format.at": "",
  "format.in": "输入",
  "format.cache": "缓存",
  "format.out": "输出",
  "format.tok": "令牌",
  "format.tokPerSec": "tok/s",
  "format.justNow": "刚刚",
  "format.ago": "前",

  // Init
  "init.initializing": "[codex-hud] 正在初始化...",
  "init.macosNote":
    "[codex-hud] 注意：请在 Codex 会话中运行，或把 CODEX_HUD_SESSION 指向 rollout JSONL 文件。",
};
