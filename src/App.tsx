import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TOPICS, TOPIC_LABEL } from "./data/topics";
import { allEvents, regionOf } from "./lib/model";
import { loadCustom, loadRegion, makeBackup, saveCustom, saveRegion } from "./lib/storage";
import { todayStr } from "./lib/time";
import type { EventRec, Filters, Region, ViewName } from "./types";
import { Overview } from "./components/Overview";
import { Board } from "./components/Board";

const EMPTY_FILTERS: Filters = { q: "", cat: "all", form: "", only: "", host: "", sort: "default" };

export function App() {
  const [view, setView] = useState<ViewName>("over");
  const [region, setRegionState] = useState<Region>(() => loadRegion());
  const [custom, setCustomState] = useState<EventRec[]>(() => loadCustom());
  const [filters, setFiltersState] = useState<Filters>(EMPTY_FILTERS);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<number | undefined>(undefined);
  const fileRef = useRef<HTMLInputElement>(null);

  const say = useCallback((msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 2000);
  }, []);

  useEffect(() => saveCustom(custom), [custom]);
  useEffect(() => saveRegion(region), [region]);

  const setRegion = useCallback((r: Region) => {
    setRegionState(r);
    setFiltersState(EMPTY_FILTERS);
  }, []);

  const setFilters = useCallback((patch: Partial<Filters>) => setFiltersState((p) => ({ ...p, ...patch })), []);

  const all = useMemo(() => allEvents(custom), [custom]);
  const events = useMemo(() => all.filter((e) => regionOf(e) === region), [all, region]);
  const cnCount = useMemo(() => all.filter((e) => regionOf(e) === "cn").length, [all]);
  const intlCount = all.length - cnCount;

  const openBoardFromOverview = useCallback((sel?: { host?: string; topic?: string }) => {
    setFiltersState((p) => ({ ...p, cat: sel?.topic ?? "all", host: sel?.host ?? "", only: "", q: "" }));
    setView("board");
  }, []);

  const doExport = () => {
    const blob = new Blob([JSON.stringify(makeBackup(custom), null, 2)], { type: "application/json" });
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
        const data = JSON.parse(String(reader.result)) as { custom?: EventRec[] };
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
        <div className="lang" role="group" aria-label="区域">
          <button className={region === "cn" ? "on" : ""} aria-pressed={region === "cn"} onClick={() => setRegion("cn")}>
            中国区 {cnCount}
          </button>
          <button className={region === "intl" ? "on" : ""} aria-pressed={region === "intl"} onClick={() => setRegion("intl")}>
            非中国区 {intlCount}
          </button>
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
          </nav>
        </div>

        <div className="navgrp">
          <h5>更多功能</h5>
          <nav className="nav">
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
            <Overview custom={custom} region={region} onOpenBoard={openBoardFromOverview} />
          ) : (
            <Board events={events} filters={filters} setFilters={setFilters} />
          )}
        </section>
      </div>

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

export const TOPIC_ALL = ["all", ...TOPICS.map((t) => t.k)] as const;
export const topicLabel = (k: string) => TOPIC_LABEL[k] ?? "其他";
