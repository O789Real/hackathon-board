export interface EventRec {
  /** 稳定 id */
  i: string;
  /** 名称 */
  n: string;
  /** 主办方 */
  h: string;
  /** 话题 key */
  c: string;
  /** 形式：线上 / 线下 / 混合 */
  f: string;
  /** 官网 */
  u?: string;
  /** 赛期文本 */
  w?: string;
  /** 截止日 YYYY-MM-DD（信源） */
  dl?: string;
  /** 赛期展示文本 */
  dw?: string;
  /** 奖金（美元） */
  pz?: number;
  /** 报名人数 */
  rg?: number;
  /** 地点 */
  loc?: string;
  /** 标签 */
  t?: string[];
  /** 说明 */
  d?: string;
  /** 常年节奏文本 */
  cy?: string;
}

export interface Topic {
  k: string;
  l: string;
  /** 该话题的标识色 */
  c: string;
}

export type Track = "want" | "watch" | "drop";

export interface Mine {
  track?: Track;
  /** 核对日期 YYYY-MM-DD */
  checked?: string;
  /** 自定义截止日 YYYY-MM-DD */
  deadline?: string;
}

export type MineMap = Record<string, Mine>;

export type ViewName = "over" | "board";

export interface Filters {
  q: string;
  cat: string;
  form: string;
  only: "" | "want" | "checked" | "deadline";
  host: string;
  sort: "default" | "track" | "name";
}
