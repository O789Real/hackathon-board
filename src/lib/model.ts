import { LIVE_EVENTS } from "../data/events";
import { SEED } from "../data/seeds";
import type { EventRec, Filters, MineMap, Region } from "../types";
import { daysLeft, endOf } from "./time";

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

export function deadlineOf(ev: EventRec, mine: MineMap): string | null {
  return mine[ev.i]?.deadline ?? ev.dl ?? null;
}

export function isManual(ev: EventRec, mine: MineMap): boolean {
  return Boolean(mine[ev.i]?.deadline);
}

export function nextDeadline(events: EventRec[], mine: MineMap): { ev: EventRec; dl: string } | null {
  const rows = events
    .map((ev) => ({ ev, dl: deadlineOf(ev, mine) }))
    .filter((x): x is { ev: EventRec; dl: string } => {
      if (!x.dl) return false;
      const d = daysLeft(x.dl);
      return d !== null && d >= 0;
    })
    .sort((a, b) => (a.dl < b.dl ? -1 : 1));
  return rows[0] ?? null;
}

export function upcoming(events: EventRec[], mine: MineMap, n: number): { ev: EventRec; dl: string }[] {
  return events
    .map((ev) => ({ ev, dl: deadlineOf(ev, mine) }))
    .filter((x): x is { ev: EventRec; dl: string } => Boolean(x.dl))
    .sort((a, b) => (a.dl < b.dl ? -1 : 1))
    .slice(0, n);
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

export function filterEvents(events: EventRec[], f: Filters, mine: MineMap, labelOf: (k: string) => string): EventRec[] {
  const list = events.filter((ev) => {
    const m = mine[ev.i] ?? {};
    if (f.cat !== "all" && ev.c !== f.cat) return false;
    if (f.form && ev.f !== f.form) return false;
    if (f.host && ev.h !== f.host) return false;
    if (f.only === "want" && m.track !== "want") return false;
    if (f.only === "checked" && !m.checked) return false;
    if (f.only === "deadline" && !(m.deadline || ev.dl)) return false;
    return hit(ev, f.q, labelOf(ev.c));
  });

  const rank = (ev: EventRec) => {
    const t = mine[ev.i]?.track;
    return t === "want" ? 0 : t === "watch" ? 1 : t === "drop" ? 3 : 2;
  };
  const dlKey = (ev: EventRec) => deadlineOf(ev, mine) ?? "9999-99-99";

  if (f.sort === "track") list.sort((a, b) => rank(a) - rank(b) || (dlKey(a) < dlKey(b) ? -1 : 1));
  else if (f.sort === "name") list.sort((a, b) => a.n.localeCompare(b.n, "zh"));
  else list.sort((a, b) => (dlKey(a) < dlKey(b) ? -1 : 1));
  return list;
}

/** 总览用：按话题 + 来源收窄，按截止日排序 */
export function scopeEvents(events: EventRec[], topic: string, host: string, q: string, mine: MineMap, labelOf: (k: string) => string): EventRec[] {
  return events
    .filter((ev) => {
      if (topic !== "all" && ev.c !== topic) return false;
      if (host && ev.h !== host) return false;
      return hit(ev, q, labelOf(ev.c));
    })
    .sort((a, b) => {
      const da = deadlineOf(a, mine);
      const db = deadlineOf(b, mine);
      if (da && db) return da < db ? -1 : 1;
      if (da) return -1;
      if (db) return 1;
      return 0;
    });
}

/** 未来 24h 内是否临近 */
export function isUrgent(dl: string | null | undefined): boolean {
  const e = dl ? endOf(dl) : null;
  if (!e) return false;
  const ms = e.getTime() - Date.now();
  return ms > 0 && ms < 2 * 86_400_000;
}
