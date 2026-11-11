import type { EventRec } from "../../types";
import { TOPICS } from "../../data/topics";
import type { OverviewData, RiverCard, RiverSource, RiverTopic } from "./NewsRiverFlow";

/**
 * 把黑客松数据翻译成 NewsRiverFlow 需要的形状。
 * 关键点：一个赛事 = 一张卡片；卡片与「来源」「话题」的关系写在 links 里，
 * 组件的 Canvas 就是按 links 画线的。
 */
export function toOverviewData(events: EventRec[], snapshotAt: string): OverviewData {
  const hosts = [...new Set(events.map((e) => e.h))];

  /** 主办方名 → 官方品牌 logo（Simple Icons CDN，逐个核实过能打开；没有的留空，界面自动回落到一字圆圈） */
  const HOST_ICONS: Record<string, string> = {
    "哔哩哔哩": "bilibili",
    "知乎": "zhihu",
    "支付宝": "alipay",
    "魔搭社区 ModelScope": "modelscope",
    Devpost: "devpost",
    GitHub: "github",
    Kaggle: "kaggle",
    Google: "google",
    PayPal: "paypal",
    Unity: "unity",
    Meta: "meta",
    Atlassian: "atlassian",
    LeetCode: "leetcode",
    Codeforces: "codeforces",
    "华为云": "huawei",
    "百度": "baidu",
    "阿里云": "alibabacloud",
    "itch.io": "itchdotio",
    "Epic Games": "epicgames",
    "DJI 大疆": "dji",
    HackerEarth: "hackerearth",
  };
  /** 发帖平台域名 → logo：主办方名没匹配上时才用（比如小红书上的 BayHack 帖，来源平台是小红书） */
  const DOMAIN_ICONS: Record<string, string> = {
    "www.xiaohongshu.com": "xiaohongshu",
    "www.bilibili.com": "bilibili",
  };
  const iconOf = (h: string): string | null => {
    if (HOST_ICONS[h]) return `https://cdn.simpleicons.org/${HOST_ICONS[h]}`;
    const firstUrl = events.find((e) => e.h === h)?.u ?? "";
    let host = "";
    try {
      host = new URL(firstUrl).hostname;
    } catch {
      host = "";
    }
    const slug = DOMAIN_ICONS[host];
    return slug ? `https://cdn.simpleicons.org/${slug}` : null;
  };

  const sources: RiverSource[] = hosts.map((h) => ({
    id: h,
    name: h,
    iconUrl: iconOf(h),
  }));

  const topics: RiverTopic[] = TOPICS.map((t) => ({ slug: t.k, name: t.l }));

  const cards: RiverCard[] = events.map((ev) => {
    const bits = [
      ev.dw ? `赛期 ${ev.dw}` : "",
      ev.rg ? `报名 ${ev.rg.toLocaleString("en-US")} 人` : "",
      ev.pz ? `奖金 $${ev.pz.toLocaleString("en-US")}` : "",
      ev.f,
    ].filter(Boolean);

    return {
      id: ev.i,
      itemIds: [ev.i],
      title: ev.n,
      summary: ev.d?.trim() || bits.join(" · ") || "详见官网",
      at: ev.dl ? new Date(`${ev.dl}T12:00:00+08:00`).toISOString() : snapshotAt,
      href: ev.u || "#",
      originalUrl: ev.u || "",
      sourceIds: [ev.h],
      topicSlugs: [ev.c],
      links: [{ sourceId: ev.h, topicSlug: ev.c }],
    };
  });

  return { snapshotAt, sources, topics, cards };
}
