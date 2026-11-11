import { useMemo } from "react";
import { TOPIC_LABEL } from "../../data/topics";
import { allEvents, regionLabel, regionOf } from "../../lib/model";
import type { EventRec, Region } from "../../types";
import { NewsRiverFlow } from "../NewsRiver/NewsRiverFlow";
import { toOverviewData } from "../NewsRiver/adapter";

interface Props {
  custom: EventRec[];
  region: Region;
  onOpenBoard: (sel?: { host?: string; topic?: string }) => void;
}

export function Overview({ custom, region, onOpenBoard }: Props) {
  const events = useMemo(
    () => allEvents(custom).filter((e) => regionOf(e) === region),
    [custom, region]
  );
  const snapshot = useMemo(() => new Date().toISOString(), []);
  const data = useMemo(() => toOverviewData(events, snapshot), [events, snapshot]);

  const live = events.filter((e) => e.dl).length;

  return (
    <>
      <div className="pagehead">
        <div>
          <h1>总览 · {regionLabel(region)}区</h1>
          <p>从来源，到分类，到具体这一场 · 点分类筛选，点来源收窄 · 左上角可切换中国 / 非中国</p>
        </div>
        <div className="right">
          <span className="pill">
            在招 <b>{live}</b>
          </span>
        </div>
      </div>

      <NewsRiverFlow
        data={data}
        moving
        onOpenAll={(source, topic) => onOpenBoard({ host: source ?? undefined, topic: topic ?? undefined })}
      />

      <div className="strip">
        <span>
          来源 <b>{new Set(events.map((e) => e.h)).size}</b> · 分类 <b>{new Set(events.map((e) => e.c)).size}</b> · 赛事{" "}
          <b>{events.length}</b>
        </span>
        <span className="r">
          <span>
            分类 {TOPIC_LABEL.ai} 等 {new Set(events.map((e) => e.c)).size} 类
          </span>
          <span>·</span>
          <span>{region === "cn" ? "国内赛事与社媒巡逻收录，日期以官网为准" : "Devpost + itch.io 自动抓取，日期以官网为准"}</span>
        </span>
      </div>
    </>
  );
}
