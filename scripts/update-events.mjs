#!/usr/bin/env node
/**
 * 从 Devpost 公开接口抓在招黑客松，生成 src/data/events.ts
 *
 *   node scripts/update-events.mjs
 *
 * 抓取失败时不会覆盖旧文件（避免把线上数据洗成空的）。
 */
import { writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../src/data/events.ts");

const MON = Object.fromEntries(
  ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m, i) => [m, i + 1]),
);

const THEME_TOPIC = {
  Gaming: "game",
  "AR/VR": "game",
  "Music/Art": "game",
  Web: "frontend",
  Design: "frontend",
  Mobile: "frontend",
  DevOps: "backend",
  Serverless: "backend",
  Databases: "backend",
  Enterprise: "backend",
  Blockchain: "web3",
  Fintech: "web3",
  "Machine Learning/AI": "ai",
  Cybersecurity: "security",
  IoT: "hardware",
};

const RULES = [
  ["web3", /web3|blockchain|ethereum|solana|crypto|defi|nft/i],
  ["game", /\bgame|gamejam|unity|godot|esport/i],
  ["frontend", /front[\- ]?end|react|vue|css|ui\/ux/i],
  ["backend", /back[\- ]?end|\bapi\b|server|database|infra/i],
  ["security", /security|\bctf\b|cyber/i],
  ["hardware", /\biot\b|hardware|robot|embedded/i],
  ["ai", /\bai\b|llm|agent|machine learning/i],
];

function topicOf(h) {
  const themes = (h.themes ?? []).map((t) => t.name);
  for (const t of themes) if (THEME_TOPIC[t]) return THEME_TOPIC[t];
  const hay = `${h.title ?? ""} ${themes.join(" ")}`;
  for (const [k, re] of RULES) if (re.test(hay)) return k;
  return "other";
}

function endDate(s) {
  if (!s) return null;
  const y = /(\d{4})/.exec(s);
  if (!y) return null;
  const parts = [...s.matchAll(/([A-Z][a-z]{2})\s+(\d{1,2})/g)];
  if (!parts.length) return null;
  const [, mon, day] = parts[parts.length - 1];
  if (!MON[mon]) return null;
  const iso = `${y[1]}-${String(MON[mon]).padStart(2, "0")}-${String(Number(day)).padStart(2, "0")}`;
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : iso;
}

function prizeOf(s) {
  if (!s) return undefined;
  const m = /data-currency-value>([\d,]+)</.exec(s) ?? /\$([\d,]+)/.exec(s);
  return m ? Number(m[1].replace(/,/g, "")) : undefined;
}

async function fetchPage(page) {
  const res = await fetch(`https://devpost.com/api/hackathons?page=${page}`, {
    headers: { "User-Agent": "Mozilla/5.0 Chrome/126", Accept: "application/json" },
    signal: AbortSignal.timeout(25_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// 按上海时区算「今天」，不能用 UTC ——否则零点到八点之间会差一天
const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Shanghai" });
const byId = new Map();

for (let page = 1; page <= 13; page++) {
  let data;
  try {
    data = await fetchPage(page);
  } catch (err) {
    console.warn(`  第 ${page} 页失败：${err.message}`);
    continue;
  }
  for (const h of data.hackathons ?? []) {
    if (byId.has(h.id)) continue;
    if (h.open_state !== "open") continue;
    const end = endDate(h.submission_period_dates);
    if (!end || end < today) continue;
    const loc = h.displayed_location?.location ?? "";
    byId.set(h.id, {
      i: `dp${h.id}`,
      n: (h.title ?? "").trim(),
      h: h.organization_name || "Devpost",
      u: h.url ?? "",
      c: topicOf(h),
      f: /online/i.test(loc) ? "线上" : "线下",
      w: "不限",
      dl: end,
      dw: h.submission_period_dates ?? "",
      pz: prizeOf(h.prize_amount),
      rg: h.registrations_count ?? undefined,
      loc,
      t: (h.themes ?? []).map((x) => x.name).filter(Boolean).slice(0, 3),
    });
  }
}

const items = [...byId.values()].sort((a, b) => (a.dl < b.dl ? -1 : a.dl > b.dl ? 1 : a.n.localeCompare(b.n)));

if (items.length < 5) {
  console.error(`只抓到 ${items.length} 条，疑似被限流，保留原文件不动。`);
  process.exit(0);
}

const stamp = new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", hour12: false });
const body = items.map((o) => "  " + JSON.stringify(o)).join(",\n");

writeFileSync(
  OUT,
  `import type { EventRec } from "../types";

// 由 scripts/update-events.mjs 自动生成 · 抓取时间 ${stamp}（Asia/Shanghai）
// 不要手改这个文件，改抓取脚本。
export const LIVE_EVENTS: EventRec[] = [
${body}
];
`,
  "utf8",
);

const dist = items.reduce((m, o) => ((m[o.c] = (m[o.c] ?? 0) + 1), m), {});
console.log(`写入 ${items.length} 条 → ${OUT}`);
console.log("话题分布:", dist);
console.log("最早截止:", items[0]?.dl, items[0]?.n);
