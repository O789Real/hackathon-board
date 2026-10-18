import { useEffect, useMemo, useState } from "react";
import { TOPIC_LABEL } from "../../data/topics";
import { allEvents, nextDeadline, upcoming } from "../../lib/model";
import { daysLeft, endOf, fmtDate } from "../../lib/time";
import type { EventRec, MineMap } from "../../types";
import { NewsRiverFlow } from "../NewsRiver/NewsRiverFlow";
import { toOverviewData } from "../NewsRiver/adapter";

const DAY = 86_400_000;

interface Props {
  mine: MineMap;
  custom: EventRec[];
  onOpenBoard: (sel?: { host?: string; topic?: string }) => void;
  onAdd: () => void;
}

function Countdown({ ev, dl, manual }: { ev: EventRec; dl: string; manual: boolean }) {
  const [left, setLeft] = useState(() => Math.max(0, (endOf(dl)?.getTime() ?? 0) - Date.now()));
  useEffect(() => {
    const id = setInterval(() => setLeft(Math.max(0, (endOf(dl)?.getTime() ?? 0) - Date.now())), 1000);
    return () => clearInterval(id);
  }, [dl]);
  const d = Math.floor(left / DAY);
  const h = Math.floor((left % DAY) / 3_600_000);
  const m = Math.floor((left % 3_600_000) / 60_000);
  const s = Math.floor((left % 60_000) / 1000);
  const dl2 = daysLeft(dl);
  return (
    <>
      <div className="cdrow">
        {[
          ["天", d],
          ["时", h],
          ["分", m],
          ["秒", s],
        ].map(([label, v], i) => (
          <div className="cdu" key={String(label)}>
            <span>{String(label)}</span>
            <b style={i === 3 ? { color: "var(--hot)" } : undefined}>{String(v).padStart(2, "0")}</b>
          </div>
        ))}
      </div>
      <div className="cdname">
        <b>{ev.n}</b> · {fmtDate(dl)} 截止
        {manual ? "" : " · 信源"}
        {dl2 !== null && dl2 <= 7 ? <span style={{ color: "var(--hot)" }}> · 就这周</span> : null}
      </div>
    </>
  );
}

export function Overview({ mine, custom, onOpenBoard, onAdd }: Props) {
  const events = useMemo(() => allEvents(custom), [custom]);
  const snapshot = useMemo(() => new Date().toISOString(), []);
  const data = useMemo(() => toOverviewData(events, snapshot), [events, snapshot]);

  const nd = nextDeadline(events, mine);
  const near = upcoming(events, mine, 3);
  const want = events.filter((e) => mine[e.i]?.track === "want").length;
  const checked = events.filter((e) => mine[e.i]?.checked).length;
  const live = events.filter((e) => e.dl).length;

  return (
    <>
      <div className="pagehead">
        <div>
          <h1>总览</h1>
          <p>从来源，到话题，到具体这一场 · 点话题筛选，点来源收窄</p>
        </div>
        <div className="right">
          <span className="pill">
            在招 <b>{live}</b>
          </span>
          <button className="btn solid" onClick={onAdd}>
            ＋ 收录一条
          </button>
        </div>
      </div>

      <NewsRiverFlow
        data={data}
        moving
        onOpenAll={(source, topic) => onOpenBoard({ host: source ?? undefined, topic: topic ?? undefined })}
      />

      <div className="panel" id="p2">
        <div className="cdpanel">
          <div className="cdleft">
            <div className="cdkick">next deadline · 下一场截止</div>
            {nd ? (
              <Countdown ev={nd.ev} dl={nd.dl} manual={Boolean(mine[nd.ev.i]?.deadline)} />
            ) : (
              <>
                <div className="cdempty">暂无</div>
                <div className="cdname" style={{ marginTop: 8 }}>
                  还没有任何截止日。
                </div>
              </>
            )}
          </div>
          <div className="cdright">
            <div className="t">最近三场</div>
            <div className="rlist">
              {near.length === 0 ? <div style={{ color: "var(--ink-4)" }}>暂无</div> : null}
              {near.map(({ ev, dl }) => {
                const d = daysLeft(dl);
                return (
                  <a
                    key={ev.i}
                    href="#board"
                    onClick={(e) => {
                      e.preventDefault();
                      onOpenBoard({ host: ev.h, topic: ev.c });
                    }}
                  >
                    <time>{d === null ? "" : d < 0 ? "已截止" : d === 0 ? "今天" : `${d} 天`}</time>
                    <b>{ev.n}</b>
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="strip">
        <span>
          来源 <b>{new Set(events.map((e) => e.h)).size}</b> · 话题 <b>{new Set(events.map((e) => e.c)).size}</b> · 赛事{" "}
          <b>{events.length}</b>
        </span>
        <span className="r">
          <span>
            话题 {TOPIC_LABEL.ai} 等 {new Set(events.map((e) => e.c)).size} 类 · 关注 {want} · 已核对 {checked}
          </span>
          <span>·</span>
          <span>Devpost 自动抓取，日期以官网为准</span>
        </span>
      </div>
    </>
  );
}
