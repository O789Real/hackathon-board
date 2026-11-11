import { useMemo, useState } from "react";
import { TOPICS, TOPIC_LABEL } from "../../data/topics";
import { deadlineText } from "../../lib/time";
import { deadlineOf, filterEvents } from "../../lib/model";
import { daysLeft, fmtDate } from "../../lib/time";
import type { EventRec, Filters } from "../../types";

interface Props {
  events: EventRec[];
  filters: Filters;
  setFilters: (patch: Partial<Filters>) => void;
}

export function Board({ events, filters, setFilters }: Props) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const labelOf = (k: string) => TOPIC_LABEL[k] ?? "其他";

  const list = useMemo(() => filterEvents(events, filters, labelOf), [events, filters]);
  const formCount = (f: string) => events.filter((e) => e.f === f).length;

  const toggle = (id: string) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <>
      <div className="pagehead">
        <div>
          <h1>赛程总表</h1>
          <p>点任意一行展开看详情 · 截止日均为信源日期，以官网为准</p>
        </div>
        <div className="right">
          <span className="pill">
            <b>{list.length}</b> / {events.length} 条
          </span>
        </div>
      </div>

      <div className="fbar">
        <div className="fgroup">
          <span className="fl">分类</span>
          <span style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            <button className="chip" aria-pressed={filters.cat === "all"} onClick={() => setFilters({ cat: "all" })}>
              全部<em>{events.length}</em>
            </button>
            {TOPICS.map((t) => {
              const n = events.filter((e) => e.c === t.k).length;
              if (!n) return null;
              return (
                <button
                  key={t.k}
                  className="chip"
                  aria-pressed={filters.cat === t.k}
                  onClick={() => setFilters({ cat: filters.cat === t.k ? "all" : t.k })}
                >
                  {t.l}
                  <em>{n}</em>
                </button>
              );
            })}
          </span>
        </div>
        <div className="fgroup">
          <span className="fl">形式</span>
          <span style={{ display: "flex", gap: 5 }}>
            {["线上", "线下", "混合"].map((f) => (
              <button
                key={f}
                className="chip"
                aria-pressed={filters.form === f}
                onClick={() => setFilters({ form: filters.form === f ? "" : f })}
              >
                {f}
                {formCount(f) ? <em>{formCount(f)}</em> : null}
              </button>
            ))}
          </span>
        </div>
        <div className="fgroup">
          <span className="fl">只看</span>
          <span style={{ display: "flex", gap: 5 }}>
            <button
              className="chip hot"
              aria-pressed={filters.only === "deadline"}
              onClick={() => setFilters({ only: filters.only === "deadline" ? "" : "deadline" })}
            >
              有截止日
            </button>
          </span>
        </div>
        <div className="sp">
          <select className="sel" value={filters.sort} onChange={(e) => setFilters({ sort: e.target.value as Filters["sort"] })}>
            <option value="default">按截止日</option>
            <option value="name">按名称</option>
          </select>
          <button className="mini" onClick={() => setFilters({ q: "", cat: "all", form: "", only: "", host: "", sort: "default" })}>
            重置
          </button>
        </div>
      </div>

      <div className="list">
        {list.map((ev, idx) => {
          const isOpen = open.has(ev.i);
          const dt = deadlineText(deadlineOf(ev), ev.cy ?? "常年");
          return (
            <div key={ev.i} className={`row${isOpen ? " open" : ""}`}>
              <button className="row-h" aria-expanded={isOpen} onClick={() => toggle(ev.i)}>
                <span className="row-i">{String(idx + 1).padStart(2, "0")}</span>
                <span className="row-n">
                  <strong>{ev.n}</strong>
                  <small>
                    {ev.h}
                    {ev.loc ? ` · ${ev.loc}` : ""}
                  </small>
                </span>
                <span className="tags">
                  <span className="tag cat">{labelOf(ev.c)}</span>
                  {ev.dl ? <span className="tag auto">信源日期</span> : null}
                </span>
                <span className="row-s">
                  <b className={dt.tone}>{dt.text}</b>
                  {ev.f}
                </span>
                <span className="row-caret">›</span>
              </button>

              <div className="row-b">
                <div>
                  <div className="pad">
                    <div>
                      <p className="desc">{ev.d || "（还没有写说明）"}</p>
                      <dl className="facts">
                        <div>
                          <dt>host</dt>
                          <dd>{ev.h || "—"}</dd>
                        </div>
                        <div>
                          <dt>分类</dt>
                          <dd>{labelOf(ev.c)}</dd>
                        </div>
                        <div>
                          <dt>形式</dt>
                          <dd>{ev.f || "—"}</dd>
                        </div>
                        {ev.dw ? (
                          <div>
                            <dt>赛期</dt>
                            <dd>{ev.dw}</dd>
                          </div>
                        ) : null}
                        {deadlineOf(ev) ? (
                          <div>
                            <dt>截止</dt>
                            <dd>{fmtDate(deadlineOf(ev))}（信源）</dd>
                          </div>
                        ) : null}
                        {ev.rg ? (
                          <div>
                            <dt>报名</dt>
                            <dd>{ev.rg.toLocaleString("en-US")} 人</dd>
                          </div>
                        ) : null}
                        {ev.pz ? (
                          <div>
                            <dt>奖金</dt>
                            <dd>${ev.pz.toLocaleString("en-US")}</dd>
                          </div>
                        ) : null}
                      </dl>
                      <div className="acts">
                        {ev.u ? (
                          <a className="btn" href={ev.u} target="_blank" rel="noopener noreferrer">
                            去官网 ↗
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {list.length === 0 ? (
        <div className="empty">
          <b>没有匹配的赛事</b>
          <p>换个分类试试，或者过几天再来看看，新赛事会持续收录进来。</p>
        </div>
      ) : null}

      <div className="strip" style={{ marginTop: 18 }}>
        <span>
          显示 <b>{list.length}</b> / 共 <b>{events.length}</b>
        </span>
        <span className="r">
          <span>{list.filter((e) => daysLeft(deadlineOf(e)) !== null && (daysLeft(deadlineOf(e)) as number) <= 7).length} 条 7 天内截止</span>
        </span>
      </div>
    </>
  );
}
