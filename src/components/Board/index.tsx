import { useMemo, useState } from "react";
import { TOPICS, TOPIC_LABEL } from "../../data/topics";
import { deadlineText } from "../../lib/time";
import { deadlineOf, filterEvents, isManual } from "../../lib/model";
import { daysLeft, fmtDate, todayStr } from "../../lib/time";
import type { EventRec, Filters, MineMap, Track } from "../../types";

interface Props {
  events: EventRec[];
  mine: MineMap;
  setMine: (updater: (prev: MineMap) => MineMap) => void;
  filters: Filters;
  setFilters: (patch: Partial<Filters>) => void;
  onAdd: () => void;
}

const TRACK_LABEL: Record<Track, string> = { want: "想参加", watch: "观察中", drop: "已放弃" };

export function Board({ events, mine, setMine, filters, setFilters, onAdd }: Props) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const labelOf = (k: string) => TOPIC_LABEL[k] ?? "其他";

  const list = useMemo(() => filterEvents(events, filters, mine, labelOf), [events, filters, mine]);
  const formCount = (f: string) => events.filter((e) => e.f === f).length;

  const toggle = (id: string) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const patchMine = (id: string, patch: Record<string, unknown>, remove?: string[]) => {
    setMine((prev) => {
      const cur = { ...(prev[id] ?? {}), ...patch };
      remove?.forEach((k) => delete (cur as Record<string, unknown>)[k]);
      return { ...prev, [id]: cur };
    });
  };

  return (
    <>
      <div className="pagehead">
        <div>
          <h1>赛程总表</h1>
          <p>点任意一行展开 · 设好自己的截止日，总览会出现倒计时</p>
        </div>
        <div className="right">
          <span className="pill">
            <b>{list.length}</b> / {events.length} 条
          </span>
        </div>
      </div>

      <div className="fbar">
        <div className="fgroup">
          <span className="fl">话题</span>
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
            {(
              [
                ["want", "我关注的"],
                ["checked", "已核对"],
                ["deadline", "有截止日"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                className="chip hot"
                aria-pressed={filters.only === k}
                onClick={() => setFilters({ only: filters.only === k ? "" : k })}
              >
                {label}
              </button>
            ))}
          </span>
        </div>
        <div className="sp">
          <select className="sel" value={filters.sort} onChange={(e) => setFilters({ sort: e.target.value as Filters["sort"] })}>
            <option value="default">按截止日</option>
            <option value="track">关注优先</option>
            <option value="name">按名称</option>
          </select>
          <button className="mini" onClick={() => setFilters({ q: "", cat: "all", form: "", only: "", host: "", sort: "default" })}>
            重置
          </button>
          <button className="btn solid" onClick={onAdd}>
            ＋ 收录
          </button>
        </div>
      </div>

      <div className="list">
        {list.map((ev, idx) => {
          const m = mine[ev.i] ?? {};
          const isOpen = open.has(ev.i);
          const dt = deadlineText(deadlineOf(ev, mine), ev.cy ?? "常年");
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
                  {m.track ? <span className="tag track">{TRACK_LABEL[m.track]}</span> : null}
                  {ev.dl && !isManual(ev, mine) ? <span className="tag auto">信源日期</span> : null}
                  {m.checked ? <span className="tag">已核对</span> : null}
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
                          <dt>话题</dt>
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
                        {deadlineOf(ev, mine) ? (
                          <div>
                            <dt>截止</dt>
                            <dd>
                              {fmtDate(deadlineOf(ev, mine))}
                              {isManual(ev, mine) ? "（你设的）" : "（信源）"}
                            </dd>
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
                          <a
                            className="btn"
                            href={ev.u}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => {
                              if (!m.checked) patchMine(ev.i, { checked: todayStr() });
                            }}
                          >
                            去官网 ↗
                          </a>
                        ) : null}
                      </div>
                    </div>

                    <div className="panelbox">
                      <h5>我的追踪</h5>
                      <div className="dl-row">
                        <input
                          type="date"
                          value={m.deadline ?? ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v) patchMine(ev.i, { deadline: v, checked: m.checked ?? todayStr() });
                            else patchMine(ev.i, {}, ["deadline"]);
                          }}
                        />
                        {m.deadline ? (
                          <button className="mini" onClick={() => patchMine(ev.i, {}, ["deadline"])}>
                            清除
                          </button>
                        ) : null}
                      </div>
                      <div className="tracks">
                        {(["want", "watch", "drop"] as Track[]).map((t) => (
                          <button
                            key={t}
                            data-t={t}
                            aria-pressed={m.track === t}
                            onClick={() => {
                              if (m.track === t) patchMine(ev.i, {}, ["track"]);
                              else patchMine(ev.i, { track: t });
                            }}
                          >
                            {t === "want" ? "想参加" : t === "watch" ? "观察" : "放弃"}
                          </button>
                        ))}
                      </div>
                      <label className="chk">
                        <input
                          type="checkbox"
                          checked={Boolean(m.checked)}
                          onChange={(e) => {
                            if (e.target.checked) patchMine(ev.i, { checked: todayStr() });
                            else patchMine(ev.i, {}, ["checked"]);
                          }}
                        />
                        已去官网核对过
                      </label>
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
          <p>换个话题，或者点右上「收录」把你自己的比赛加进来。</p>
        </div>
      ) : null}

      <div className="strip" style={{ marginTop: 18 }}>
        <span>
          显示 <b>{list.length}</b> / 共 <b>{events.length}</b>
        </span>
        <span className="r">
          <span>{list.filter((e) => daysLeft(deadlineOf(e, mine)) !== null && (daysLeft(deadlineOf(e, mine)) as number) <= 7).length} 条 7 天内截止</span>
        </span>
      </div>
    </>
  );
}
