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

  const sources: RiverSource[] = hosts.map((h) => ({
    id: h,
    name: h,
    iconUrl: null,
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
