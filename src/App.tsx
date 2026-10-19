import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TOPICS, TOPIC_LABEL } from "./data/topics";
import { allEvents, deadlineOf } from "./lib/model";
import { loadCustom, loadMine, makeBackup, saveCustom, saveMine } from "./lib/storage";
import { todayStr } from "./lib/time";
import type { EventRec, Filters, MineMap, ViewName } from "./types";
import { Overview } from "./components/Overview";
import { Board } from "./components/Board";

const EMPTY_FILTERS: Filters = { q: "", cat: "all", form: "", only: "", host: "", sort: "default" };

export function App() {
  const [view, setView] = useState<ViewName>("over");
  const [mine, setMineState] = useState<MineMap>(() => loadMine());
  const [custom, setCustomState] = useState<EventRec[]>(() => loadCustom());
  const [filters, setFiltersState] = useState<Filters>(EMPTY_FILTERS);
  const [dialog, setDialog] = useState(false);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<number | undefined>(undefined);
  const fileRef = useRef<HTMLInputElement>(null);

  const say = useCallback((msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 2000);
  }, []);

  useEffect(() => saveMine(mine), [mine]);
  useEffect(() => saveCustom(custom), [custom]);

  const setMine = useCallback((updater: (prev: MineMap) => MineMap) => setMineState((p) => updater(p)), []);
  const setFilters = useCallback((patch: Partial<Filters>) => setFiltersState((p) => ({ ...p, ...patch })), []);

  const events = useMemo(() => allEvents(custom), [custom]);
  const want = events.filter((e) => mine[e.i]?.track === "want").length;
  const withDl = events.filter((e) => deadlineOf(e, mine)).length;

  const openBoardFromOverview = useCallback((sel?: { host?: string; topic?: string }) => {
    setFiltersState((p) => ({ ...p, cat: sel?.topic ?? "all", host: sel?.host ?? "", only: "", q: "" }));
    setView("board");
  }, []);

  const doExport = () => {
    const blob = new Blob([JSON.stringify(makeBackup(mine, custom), null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `赛道板-我的数据-${todayStr()}.json`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    say("已导出");
  };

  const doImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result)) as { mine?: MineMap; custom?: EventRec[] };
        if (data.mine) setMineState((p) => ({ ...p, ...data.mine }));
        if (Array.isArray(data.custom)) {
          setCustomState((prev) => {
            const ids = new Set(prev.map((c) => c.i));
            return [...prev, ...data.custom!.filter((c) => !ids.has(c.i))];
          });
        }
        say("已导入并合并");
      } catch {
        say("文件格式不对");
      }
    };
    reader.readAsText(file);
  };

  const nav = [
    { key: "over", label: "总览", count: null as number | null },
    { key: "board", label: "赛程", count: events.length },
  ];

  return (
    <div className="app">
      <aside className="side">
        <div className="brand">
          <i aria-hidden="true" />
          <b>赛道板</b>
        </div>
        <div className="lang">
          <button className="on">中文</button>
          <button disabled title="暂未做">English</button>
        </div>

        <div className="navgrp">
          <h5>主要内容</h5>
          <nav className="nav">
            {nav.map((n) => (
              <a
                key={n.key}
                href={`#${n.key}`}
                className={view === n.key ? "on" : ""}
                onClick={(e) => {
                  e.preventDefault();
                  setView(n.key as ViewName);
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                {n.label}
                {n.count !== null ? <em>{n.count}</em> : null}
              </a>
            ))}
            <a
              href="#board"
              onClick={(e) => {
                e.preventDefault();
                setFilters({ only: "want" });
                setView("board");
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M12 3l2.6 5.6L21 9.4l-4.5 4.3 1.1 6.3L12 17l-5.6 3 1.1-6.3L3 9.4l6.4-.8z" />
              </svg>
              我关注的<em>{want}</em>
            </a>
            <a
              href="#board"
              onClick={(e) => {
                e.preventDefault();
                setFilters({ only: "deadline" });
                setView("board");
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <circle cx="12" cy="13" r="8" />
                <path d="M12 9v4l2.5 2M9 2h6" />
              </svg>
              已设截止<em>{withDl}</em>
            </a>
          </nav>
        </div>

        <div className="navgrp">
          <h5>更多功能</h5>
          <nav className="nav">
            <a
              href="#add"
              onClick={(e) => {
                e.preventDefault();
                setDialog(true);
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M12 5v14M5 12h14" />
              </svg>
              收录一条
            </a>
            <a
              href="#export"
              onClick={(e) => {
                e.preventDefault();
                doExport();
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M12 3v12M7 10l5 5 5-5M4 21h16" />
              </svg>
              导出数据
            </a>
            <a
              href="#import"
              onClick={(e) => {
                e.preventDefault();
                fileRef.current?.click();
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M12 21V9M7 14l5-5 5 5M4 3h16" />
              </svg>
              导入数据
            </a>
          </nav>
        </div>

        <div className="side-foot">
          <div className="stamp">
            收录 <b>{events.length}</b> · 在招 <b>{events.filter((e) => e.dl).length}</b>
            <br />
            关注 <b>{want}</b> · 已核对 <b>{events.filter((e) => mine[e.i]?.checked).length}</b>
          </div>
        </div>
      </aside>

      <div className="appmain">
        <header className="topbar">
          <span className="kicker">hackathon · board</span>
          <div className="search">
            <input
              type="search"
              value={filters.q}
              placeholder="搜赛事 / 主办 / 分类…"
              aria-label="搜索"
              onChange={(e) => setFilters({ q: e.target.value })}
            />
            <kbd>/</kbd>
          </div>
          <div className="pill">
            收录 <b>{events.length}</b>
          </div>
        </header>

        <section className="view">
          {view === "over" ? (
            <Overview
              mine={mine}
              custom={custom}
              onOpenBoard={openBoardFromOverview}
              onAdd={() => setDialog(true)}
            />
          ) : (
            <Board
              events={events}
              mine={mine}
              setMine={setMine}
              filters={filters}
              setFilters={setFilters}
              onAdd={() => setDialog(true)}
            />
          )}
        </section>
      </div>

      {dialog ? (
        <AddDialog
          onClose={() => setDialog(false)}
          onSubmit={(rec) => {
            setCustomState((prev) => [rec, ...prev]);
            setDialog(false);
            setFilters({ cat: "all", only: "", q: "", host: "" });
            say("已收录 · 记得去官网核对时间");
          }}
        />
      ) : null}

      <input
        ref={fileRef}
        type="file"
        accept="application/json"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) doImport(f);
          e.target.value = "";
        }}
      />
      <div className={`toast${toast ? " on" : ""}`}>{toast}</div>
    </div>
  );
}

function AddDialog({ onClose, onSubmit }: { onClose: () => void; onSubmit: (rec: EventRec) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState("");
  const [host, setHost] = useState("");
  const [url, setUrl] = useState("");
  const [cat, setCat] = useState(TOPICS[0].k);
  const [form, setForm] = useState("线上");
  const [desc, setDesc] = useState("");

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  return (
    <dialog ref={ref} className="dlg" onCancel={onClose} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const n = name.trim();
          if (!n) return;
          onSubmit({
            i: `c_${Date.now().toString(36)}`,
            n,
            h: host.trim() || "我自己收录",
            u: url.trim(),
            c: cat,
            t: ["自定义"],
            f: form,
            cy: "待确认",
            d: desc.trim(),
          });
        }}
      >
        <div className="dlg-h">
          <h3>收录一条赛程</h3>
          <button type="button" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="dlg-b">
          <div className="field">
            <label htmlFor="f-name">名称 *</label>
            <input id="f-name" required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} placeholder="例：某某杯 AI 挑战赛" />
          </div>
          <div className="two">
            <div className="field">
              <label htmlFor="f-host">主办方</label>
              <input id="f-host" maxLength={40} value={host} onChange={(e) => setHost(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="f-url">官网链接</label>
              <input id="f-url" type="url" maxLength={200} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" />
            </div>
          </div>
          <div className="two">
            <div className="field">
              <label htmlFor="f-cat">分类</label>
              <select id="f-cat" value={cat} onChange={(e) => setCat(e.target.value)}>
                {TOPICS.map((t) => (
                  <option key={t.k} value={t.k}>
                    {t.l}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="f-form">形式</label>
              <select id="f-form" value={form} onChange={(e) => setForm(e.target.value)}>
                <option>线上</option>
                <option>线下</option>
                <option>混合</option>
              </select>
            </div>
          </div>
          <div className="field">
            <label htmlFor="f-desc">一句话说明</label>
            <textarea id="f-desc" rows={2} maxLength={200} value={desc} onChange={(e) => setDesc(e.target.value)} />
          </div>
        </div>
        <div className="dlg-f">
          <button type="button" className="btn" onClick={onClose}>
            取消
          </button>
          <button type="submit" className="btn solid">
            收录
          </button>
        </div>
      </form>
    </dialog>
  );
}

export const TOPIC_ALL = ["all", ...TOPICS.map((t) => t.k)] as const;
export const topicLabel = (k: string) => TOPIC_LABEL[k] ?? "其他";
