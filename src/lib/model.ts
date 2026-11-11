import { LIVE_EVENTS } from "../data/events";
import { SEED } from "../data/seeds";
import type { EventRec, Filters, Region } from "../types";

export function allEvents(custom: EventRec[]): EventRec[] {
  return [...custom, ...LIVE_EVENTS, ...SEED];
}

/** 明确归中国区的常驻种子 id（主办方在中国；判定人定，不靠猜地点） */
const CN_SEED_IDS = new Set([
  "ospp", "tianchi", "datafountain", "kesci", "datacastle", "huaweicloud",
  "lanqiao", "mcm", "ccsp", "paddle", "modelscope", "xfyun", "ciscn",
  "ncss", "tzb", "c4", "cigagj", "booomjam", "taptaplight", "tencentgcc",
  "neteaseminigame", "bilibili-ai-creator-s2", "jimeng-ai-interactive",
  "bayhack-2026", "zhihu-hackathon-s3", "modelscope-ai-game-s3",
  "aholo-3d-ai-hackathon", "payathon-2026",
]);

/**
 * 区域判定：中国 / 非中国。
 * - 实时抓取（itch-* / dp*）是海外平台的赛事，一律归非中国区；
 * - 巡逻收录（bilibili-* / jimeng-* 等社交来源 id）与手工常驻按 CN 名单归中国区；
 * - 访客自己收录的（c_*）默认中国区，她收的多半是国内赛事。
 * 想调整某个种子的归属：把 id 加进 / 移出 CN_SEED_IDS 即可。
 */
export function regionOf(ev: EventRec): Region {
  if (ev.i.startsWith("itch-") || ev.i.startsWith("dp")) return "intl";
  if (CN_SEED_IDS.has(ev.i)) return "cn";
  if (ev.i.startsWith("c_")) return "cn";
  return "intl";
}

export function regionLabel(r: Region): string {
  return r === "cn" ? "中国" : "非中国";
}

/** 截止日只认信源数据（ev.dl）；本站是静态看板，不做个人记录 */
export function deadlineOf(ev: EventRec): string | null {
  return ev.dl ?? null;
}

function hit(ev: EventRec, q: string, label: string): boolean {
  const query = q.trim().toLowerCase();
  if (!query) return true;
  // 全字段：名称/主办/分类/标签/说明/地点/形式/赛期/常年节奏都可搜
  const hay = [ev.n, ev.h, ev.c, label, (ev.t ?? []).join(" "), ev.d ?? "", ev.loc ?? "", ev.f, ev.dw ?? "", ev.cy ?? ""]
    .join(" ")
    .toLowerCase();
  // 多个词用空格分隔 = 全部命中才算（AND），如「上海 游戏」「线上 ai」
  return query.split(/\s+/).every((token) => hay.includes(token));
}

export function filterEvents(events: EventRec[], f: Filters, labelOf: (k: string) => string): EventRec[] {
  const list = events.filter((ev) => {
    if (f.cat !== "all" && ev.c !== f.cat) return false;
    if (f.form && ev.f !== f.form) return false;
    if (f.host && ev.h !== f.host) return false;
    if (f.only === "deadline" && !ev.dl) return false;
    return hit(ev, f.q, labelOf(ev.c));
  });

  const dlKey = (ev: EventRec) => deadlineOf(ev) ?? "9999-99-99";

  if (f.sort === "name") list.sort((a, b) => a.n.localeCompare(b.n, "zh"));
  else list.sort((a, b) => (dlKey(a) < dlKey(b) ? -1 : 1));
  return list;
}
