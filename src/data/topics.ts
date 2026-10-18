import type { Topic } from "../types";

export const TOPICS: Topic[] = [
  {"k": "game", "l": "游戏黑客松", "c": "#e08a7a"},
  {"k": "frontend", "l": "前端黑客松", "c": "#d9a75a"},
  {"k": "backend", "l": "后端黑客松", "c": "#a8c46a"},
  {"k": "web3", "l": "Web3 / 虚拟货币", "c": "#6fb98f"},
  {"k": "ai", "l": "AI / 大模型", "c": "#66b3b3"},
  {"k": "data", "l": "数据与算法", "c": "#7aa7d9"},
  {"k": "security", "l": "安全 / CTF", "c": "#8f8fd9"},
  {"k": "hardware", "l": "硬件 / 机器人", "c": "#b98fd9"},
  {"k": "opensource", "l": "开源与社区", "c": "#d98fbf"},
  {"k": "startup", "l": "创业 / 商业", "c": "#c9a06a"},
  {"k": "other", "l": "其他", "c": "#9aa0a6"}
];

export const TOPIC_LABEL: Record<string, string> = Object.fromEntries(
  TOPICS.map((t) => [t.k, t.l]),
);

export function topicColor(k: string): string {
  return TOPICS.find((t) => t.k === k)?.c ?? "#9aa0a6";
}
