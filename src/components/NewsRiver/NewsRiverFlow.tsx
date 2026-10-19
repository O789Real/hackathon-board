import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import "./news-river.css";

// ============================================================================
// 1. 调色板与话题分类映射 (还原自 palette-Bv3b64bk.js)
// ============================================================================

export type PaletteCategory =
  | "attack"
  | "agent"
  | "defense"
  | "alignment"
  | "eval"
  | "incident"
  | "governance"
  | "tools"
  | "opinion"
  | "ainews"
  | "company";

export const PALETTE: Record<"dark" | "light", Record<PaletteCategory, [number, number, number]>> = {
  dark: {
    attack: [224, 128, 95],
    agent: [232, 160, 98],
    defense: [98, 194, 162],
    alignment: [165, 152, 232],
    eval: [114, 170, 220],
    incident: [220, 174, 85],
    governance: [220, 128, 168],
    tools: [162, 200, 110],
    opinion: [189, 184, 174],
    ainews: [133, 129, 122],
    company: [232, 230, 225],
  },
  light: {
    attack: [181, 74, 44],
    agent: [180, 98, 31],
    defense: [31, 122, 95],
    alignment: [90, 75, 176],
    eval: [44, 103, 155],
    incident: [147, 100, 12],
    governance: [163, 61, 110],
    tools: [77, 122, 29],
    opinion: [107, 103, 95],
    ainews: [141, 138, 132],
    company: [20, 20, 18],
  },
};

export const TOPIC_CATEGORY_MAP: Record<string, PaletteCategory> = {
  jailbreak: "attack",
  "prompt-injection": "attack",
  backdoor: "attack",
  privacy: "attack",
  "red-teaming": "attack",
  cyber: "attack",
  "supply-chain": "attack",
  "agent-security": "agent",
  defense: "defense",
  "open-models": "defense",
  alignment: "alignment",
  scheming: "alignment",
  "reward-hacking": "alignment",
  cot: "alignment",
  interpretability: "alignment",
  "ai-control": "alignment",
  evals: "eval",
  "system-cards": "eval",
  "dangerous-capabilities": "eval",
  incidents: "incident",
  policy: "governance",
  frameworks: "governance",
  tools: "tools",
  opinions: "opinion",
  "ai-news": "ainews",
  // —— 黑客松话题（映射到既有的 11 个语义色，不新增颜色）——
  game: "incident",
  frontend: "eval",
  backend: "tools",
  web3: "governance",
  ai: "attack",
  data: "ainews",
  security: "agent",
  hardware: "alignment",
  opensource: "defense",
  startup: "company",
  other: "opinion",
};

// ============================================================================
// 2. 数据类型定义 (对应 /api/site/overview?lang=zh 接口返回结构)
// ============================================================================

export interface RiverSource {
  id: string;
  name: string;
  iconUrl: string | null;
  iconSrcSet?: string;
}

export interface RiverTopic {
  slug: string;
  name: string;
  group?: "company" | string;
}

export interface RiverLink {
  sourceId: string;
  topicSlug: string;
}

export interface RiverCard {
  id: string;
  itemIds: string[];
  title: string;
  summary: string;
  at: string;
  href: string;
  originalUrl: string;
  sourceIds: string[];
  topicSlugs: string[];
  links: RiverLink[];
}

export interface OverviewData {
  snapshotAt: string;
  from?: string;
  sources: RiverSource[];
  sourceTotal?: number;
  topics: RiverTopic[];
  cards: RiverCard[];
}

// ============================================================================
// 3. 辅助组件与 Hooks (还原自 shared.js & source-directory.js)
// ============================================================================

function getInitialChar(name: string): string {
  const cleaned = name.replace(/（RSS）|（网页）|（API）/g, "").trim();
  const first = cleaned.replace(/^[^\p{L}\p{N}]+/u, "")[0] ?? "A";
  return first.toUpperCase();
}

export function SourceAvatar({
  name,
  iconUrl,
  iconSrcSet,
  size = 18,
}: {
  name: string;
  iconUrl?: string | null;
  iconSrcSet?: string;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);

  if (iconUrl && !failed) {
    return (
      <img
        src={iconUrl}
        srcSet={iconSrcSet}
        sizes={`${size}px`}
        decoding="async"
        alt=""
        width={size}
        height={size}
        loading="lazy"
        onError={() => setFailed(true)}
        className="shrink-0 rounded-full bg-bg-sunk object-cover"
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover" }}
      />
    );
  }

  // 根据名称哈希计算固定的 OKLCH 色相作为文字头像背景
  let hue = 0;
  for (const ch of name) {
    hue = (hue * 31 + ch.charCodeAt(0)) % 360;
  }

  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        fontSize: Math.max(9, Math.round(size * 0.5)),
        background: `oklch(0.6 0.07 ${hue})`,
        borderRadius: "50%",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 600,
        color: "#fff",
        flexShrink: 0,
      }}
    >
      {getInitialChar(name)}
    </span>
  );
}

/** 卡片列表位移 FLIP 动画 Hook (还原自 source-directory-BIKOSWRj.js) */
function useCardFlipAnimation(
  containerRef: React.RefObject<HTMLElement | null>,
  depKey: string,
  enabled: boolean
) {
  const prevTopsRef = useRef<Map<string, number>>(new Map());

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const elements = [...container.querySelectorAll<HTMLElement>("[data-river-card]")];
    const currentTops = new Map(
      elements.map((el) => [el.dataset.riverCard!, el.offsetTop])
    );

    if (enabled && prevTopsRef.current.size && typeof Element.prototype.animate === "function") {
      for (const el of elements) {
        const id = el.dataset.riverCard!;
        const prevTop = prevTopsRef.current.get(id);
        const nextTop = currentTops.get(id)!;

        if (prevTop === undefined) {
          el.animate(
            [
              { opacity: 0, transform: "translateY(-14px)" },
              { opacity: 1, transform: "none" },
            ],
            { duration: 560, easing: "cubic-bezier(.2,.8,.2,1)" }
          );
        } else if (Math.abs(prevTop - nextTop) > 1) {
          el.animate(
            [
              { transform: `translateY(${prevTop - nextTop}px)` },
              { transform: "none" },
            ],
            { duration: 520, easing: "cubic-bezier(.2,.8,.2,1)" }
          );
        }
      }
    }

    prevTopsRef.current = currentTops;
  }, [depKey]);
}

function isFocusVisible(target: EventTarget | null): boolean {
  try {
    return target instanceof HTMLElement && target.matches(":focus-visible");
  } catch {
    return false;
  }
}

/** 懒加载完整信源目录 */
function useSourceDirectory(data: OverviewData, apiBase = "") {
  const [extraSources, setExtraSources] = useState<RiverSource[] | null>(null);
  const loadingRef = useRef(false);

  const sources = useMemo(() => {
    if (!extraSources) return data.sources;
    return [
      ...extraSources,
      ...data.sources.filter((s) => !extraSources.some((es) => es.id === s.id)),
    ];
  }, [extraSources, data]);

  const load = () => {
    if (
      loadingRef.current ||
      extraSources ||
      (data.sourceTotal ?? 0) <= data.sources.length
    ) {
      return;
    }
    loadingRef.current = true;
    fetch(`${apiBase}/api/site/overview/sources?lang=zh`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then(
        (json) => setExtraSources(json.sources),
        () => {
          loadingRef.current = false;
        }
      );
  };

  return { sources, load };
}

// ============================================================================
// 4. Canvas 连线与粒子流动画引擎 (还原自 NewsRiverFlow-BlLyoq75.js)
// ============================================================================

const ARRIVAL_MS = 950;
const CYCLE_MS = 1250;

const rgba = (rgb: [number, number, number], alpha: number) =>
  `rgba(${rgb.join(",")},${alpha})`;

interface Point {
  x: number;
  y: number;
}

interface CurveEdge {
  from: Point;
  to: Point;
  source: string;
  topic: string;
  weight: number;
}

/** 计算三次贝塞尔曲线上参数 t (0~1) 处的坐标 */
function sampleBezier(from: Point, to: Point, t: number, vertical: boolean): Point {
  if (vertical) {
    const swapped = sampleBezier(
      { x: from.y, y: from.x },
      { x: to.y, y: to.x },
      t,
      false
    );
    return { x: swapped.y, y: swapped.x };
  }
  const inv = 1 - t;
  const ctrlOffset = Math.max(35, Math.abs(to.x - from.x) * 0.55);
  return {
    x:
      inv ** 3 * from.x +
      3 * inv * inv * t * (from.x + ctrlOffset) +
      3 * inv * t * t * (to.x - ctrlOffset) +
      t ** 3 * to.x,
    y:
      inv ** 3 * from.y +
      3 * inv * inv * t * from.y +
      3 * inv * t * t * to.y +
      t ** 3 * to.y,
  };
}

function mountRiverCanvas({
  canvas,
  stage,
  data,
  cards,
  current,
  moving,
  lit = null,
  clock,
  cycleKey,
  onArrival,
  onNext,
}: {
  canvas: HTMLCanvasElement;
  stage: HTMLElement;
  data: OverviewData;
  cards: RiverCard[];
  current: RiverCard | undefined;
  moving: boolean;
  lit: Set<string> | null;
  clock: { key: string; elapsed: number; arrived: boolean };
  cycleKey: string;
  onArrival: () => void;
  onNext: () => void;
}) {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    onArrival();
    return () => {};
  }

  if (clock.key !== cycleKey) {
    clock.key = cycleKey;
    clock.elapsed = 0;
    clock.arrived = false;
  }

  let rafId = 0;
  let sourceToTopicEdges: CurveEdge[] = [];
  let topicToCardEdges: CurveEdge[] = [];
  let width = 0;
  let height = 0;
  let isMobile = false;
  let isDark = false;
  let dotColor = "";
  let lastTime = performance.now();

  const companySlugs = new Set(
    data.topics.filter((t) => t.group === "company").map((t) => t.slug)
  );

  const getTopicColor = (slug: string): [number, number, number] => {
    const category =
      TOPIC_CATEGORY_MAP[slug] ?? (companySlugs.has(slug) ? "company" : "opinion");
    return PALETTE[isDark ? "dark" : "light"][category];
  };

  // 测量 DOM 节点位置并构建连线拓扑
  const measureLayout = () => {
    const stageRect = stage.getBoundingClientRect();
    width = stageRect.width;
    height = stageRect.height;
    isMobile = matchMedia("(max-width:700px)").matches;

    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const style = getComputedStyle(stage);
    isDark = style.getPropertyValue("--river-dark").trim() === "1";
    dotColor = style.getPropertyValue("--color-ink-3").trim() || "#888";

    const collectAnchors = (
      selector: string,
      dataKey: string,
      useEndEdge: boolean,
      clipContainer?: Element | null
    ) => {
      const map = new Map<string, Point>();
      const clipRect = clipContainer?.getBoundingClientRect();
      for (const el of stage.querySelectorAll<HTMLElement>(selector)) {
        const rect = el.getBoundingClientRect();
        const centerY = rect.top + rect.height / 2;
        if (!rect.width || !rect.height) continue;
        if (clipRect && (centerY < clipRect.top + 8 || centerY > clipRect.bottom - 8)) {
          continue;
        }
        const key = el.dataset[dataKey];
        if (!key) continue;
        map.set(
          key,
          isMobile
            ? {
                x: rect.left + rect.width / 2 - stageRect.left,
                y: (useEndEdge ? rect.bottom : rect.top) - stageRect.top,
              }
            : {
                x: (useEndEdge ? rect.right : rect.left) - stageRect.left,
                y: centerY - stageRect.top,
              }
        );
      }
      return map;
    };

    // 1) 收集左侧信源节点坐标（如果在滚动视口外，回退到底部当前信源胶囊坐标）
    const sourcePoints = collectAnchors(
      "[data-river-source]",
      "riverSource",
      true,
      stage.querySelector(".river-source-grid")
    );
    for (const [id, pt] of collectAnchors("[data-river-origin]", "riverOrigin", true)) {
      if (!sourcePoints.has(id)) sourcePoints.set(id, pt);
    }

    // 2) 收集中间话题节点坐标
    const topicPoints = collectAnchors(
      "[data-river-topic]",
      "riverTopic",
      false,
      stage.querySelector(".river-topic-list")
    );

    // 3) 收集右侧卡片节点坐标
    const cardPoints = collectAnchors("[data-river-card]", "riverCard", false);

    // 4) 构建「来源 -> 话题」连线并累加权重
    const stMap = new Map<string, CurveEdge>();
    const activeCards = isMobile ? (current ? [current] : []) : cards;
    for (const card of activeCards) {
      for (const { sourceId, topicSlug } of card.links) {
        const from = sourcePoints.get(sourceId);
        const to = topicPoints.get(topicSlug);
        if (!from || !to) continue;
        if (lit && !lit.has(topicSlug) && card !== current) continue;

        const key = JSON.stringify([sourceId, topicSlug]);
        const edge = stMap.get(key) ?? {
          from,
          to,
          source: sourceId,
          topic: topicSlug,
          weight: 0,
        };
        edge.weight += 1 / card.links.length;
        stMap.set(key, edge);
      }
    }
    sourceToTopicEdges = [...stMap.values()];

    // 5) 构建「话题右侧 -> 新闻卡片左侧」连线
    topicToCardEdges = [];
    for (const card of cards) {
      const to = cardPoints.get(card.id);
      if (!to) continue;
      for (const slug of card.topicSlugs) {
        const topicEl = stage.querySelector<HTMLElement>(
          `[data-river-topic="${CSS.escape(slug)}"]`
        );
        if (!topicEl || !topicPoints.has(slug)) continue;
        const rect = topicEl.getBoundingClientRect();
        topicToCardEdges.push({
          from: isMobile
            ? {
                x: rect.left + rect.width / 2 - stageRect.left,
                y: rect.bottom - stageRect.top,
              }
            : {
                x: rect.right - stageRect.left,
                y: rect.top + rect.height / 2 - stageRect.top,
              },
          to,
          source: card.id,
          topic: slug,
          weight: 1,
        });
      }
    }
  };

  // 绘制单条三次贝塞尔曲线
  const drawCurve = (edge: CurveEdge, alpha: number, lineWidth: number) => {
    const { from, to } = edge;
    const ctrl = Math.max(35, Math.abs(isMobile ? to.y - from.y : to.x - from.x) * 0.55);
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    if (isMobile) {
      ctx.bezierCurveTo(from.x, from.y + ctrl, to.x, to.y - ctrl, to.x, to.y);
    } else {
      ctx.bezierCurveTo(from.x + ctrl, from.y, to.x - ctrl, to.y, to.x, to.y);
    }
    ctx.strokeStyle = rgba(getTopicColor(edge.topic), alpha);
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  };

  // 绘制沿曲线流动的彗星粒子 + 径向发光光晕
  const drawComet = (edge: CurveEdge, progress: number) => {
    const rgb = getTopicColor(edge.topic);
    for (let step = 18; step >= 0; step--) {
      const t = progress - step * 0.006;
      if (t < 0 || t > 1) continue;
      const pt = sampleBezier(edge.from, edge.to, t, isMobile);
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, step ? 1.2 : 2.8, 0, Math.PI * 2);
      ctx.fillStyle = rgba(rgb, (1 - step / 20) * 0.85);
      ctx.fill();
    }
    const head = sampleBezier(
      edge.from,
      edge.to,
      Math.min(1, Math.max(0, progress)),
      isMobile
    );
    const grad = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, 14);
    grad.addColorStop(0, rgba(rgb, 0.35));
    grad.addColorStop(1, rgba(rgb, 0));
    ctx.fillStyle = grad;
    ctx.fillRect(head.x - 14, head.y - 14, 28, 28);
  };

  // 主渲染循环
  const renderFrame = (now: number) => {
    if (moving) clock.elapsed += now - lastTime;
    lastTime = now;

    ctx.clearRect(0, 0, width, height);

    // 1) 绘制背景点阵网格 (27px 间距)
    ctx.fillStyle = dotColor;
    ctx.globalAlpha = isDark ? 0.14 : 0.09;
    for (let x = 15; x < width; x += 27) {
      for (let y = 16; y < height; y += 27) {
        ctx.fillRect(x, y, 1, 1);
      }
    }
    ctx.globalAlpha = 1;

    // 2) 绘制底层静态半透明连线
    for (const edge of sourceToTopicEdges) {
      drawCurve(edge, isDark ? 0.1 : 0.12, Math.min(7, 0.7 + Math.sqrt(edge.weight) * 0.55));
    }
    for (const edge of topicToCardEdges) {
      drawCurve(edge, 0.18, 1);
    }

    // 3) 绘制当前激活卡片的高亮连线与两阶段粒子流：
    //    - 0.00 ~ 0.62: 粒子从「信源」流向「话题」
    //    - 0.58 ~ 1.00: 粒子从「话题」流向「右侧卡片」
    const progress = Math.min(1, clock.elapsed / ARRIVAL_MS);

    for (const edge of sourceToTopicEdges) {
      const isCurrentEdge = current?.links.some(
        (l) => l.sourceId === edge.source && l.topicSlug === edge.topic
      );
      if (isCurrentEdge) {
        drawCurve(edge, 0.5, 1.35);
        if (moving && progress < 0.62) {
          drawComet(edge, progress / 0.62);
        }
      }
    }

    for (const edge of topicToCardEdges) {
      if (edge.source === current?.id) {
        drawCurve(edge, 0.42, 1.3);
        if (moving && progress >= 0.58 && progress < 1) {
          drawComet(edge, (progress - 0.58) / 0.42);
        }
      }
    }

    // 4) 粒子到达卡片时揭开卡片骨架屏 (950ms)，满一个周期切换下一条 (1250ms)
    if (moving && clock.elapsed >= ARRIVAL_MS && !clock.arrived) {
      clock.arrived = true;
      onArrival();
    }
    if (moving && clock.elapsed >= CYCLE_MS) {
      onNext();
      return;
    }
    if (moving) {
      rafId = requestAnimationFrame(renderFrame);
    }
  };

  const refresh = () => {
    measureLayout();
    if (!moving) renderFrame(performance.now());
  };

  const ro = new ResizeObserver(refresh);
  ro.observe(stage);

  const mo = new MutationObserver(refresh);
  mo.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class", "data-theme"],
  });

  const darkMq = matchMedia("(prefers-color-scheme: dark)");
  darkMq.addEventListener("change", refresh);
  stage.addEventListener("scroll", refresh, true);

  measureLayout();
  renderFrame(lastTime);

  return () => {
    cancelAnimationFrame(rafId);
    ro.disconnect();
    mo.disconnect();
    darkMq.removeEventListener("change", refresh);
    stage.removeEventListener("scroll", refresh, true);
  };
}

// ============================================================================
// 5. 话题多样性轮播排序算法 (FNV-1a Hash + 话题冷却间距贪心重排)
// ============================================================================

function fnv1aHash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  }
  return (h >>> 0) / 4294967296;
}

const TOPIC_COOLDOWN = 40;

function diversifyCards(cards: RiverCard[], seed: number): RiverCard[] {
  const pool = [...cards];
  const result: RiverCard[] = [];
  const lastSeenAt = new Map<string, number>();
  const jitter = new Map(pool.map((c) => [c.id, fnv1aHash(`${seed}:${c.id}`)]));

  while (pool.length) {
    let bestIdx = 0;
    let bestScore = -Infinity;

    for (let i = 0; i < pool.length; i += 1) {
      const candidate = pool[i];
      const distances = candidate.topicSlugs.map((slug) =>
        Math.min(TOPIC_COOLDOWN, result.length - (lastSeenAt.get(slug) ?? -40))
      );
      const minDist = distances.length ? Math.min(...distances) : TOPIC_COOLDOWN;
      const sumDist = distances.reduce((a, b) => a + b, 0);
      const score = minDist + sumDist / 4000 + (jitter.get(candidate.id) ?? 0) / 1000;

      if (score > bestScore) {
        bestIdx = i;
        bestScore = score;
      }
    }

    const [chosen] = pool.splice(bestIdx, 1);
    for (const slug of chosen.topicSlugs) {
      lastSeenAt.set(slug, result.length);
    }
    result.push(chosen);
  }

  return result;
}

// ============================================================================
// 6. 主组件：NewsRiverFlow (03 / 新闻流 | 从来源，到话题)
// ============================================================================

export function NewsRiverFlow({
  data,
  moving = true,
  apiBase = "",
  onOpenAll,
}: {
  data: OverviewData;
  moving?: boolean;
  apiBase?: string;
  onOpenAll?: (source: string | null, topic: string | null) => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cardsContainerRef = useRef<HTMLDivElement>(null);

  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [hoveredReader, setHoveredReader] = useState(false);
  const [focusedReader, setFocusedReader] = useState(false);
  const [inView, setInView] = useState(false);
  const [topicQuery, setTopicQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const [arrived, setArrived] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [sourcesExpanded, setSourcesExpanded] = useState(false);
  const [topicsExpanded, setTopicsExpanded] = useState(false);
  const [touchedPause, setTouchedPause] = useState(false);

  const clockRef = useRef({ key: "", elapsed: 0, arrived: false });
  const { sources: allSources, load: loadMoreSources } = useSourceDirectory(data, apiBase);

  useEffect(() => {
    if (inView) loadMoreSources();
  }, [inView]);

  const sourceMap = useMemo(
    () => new Map(data.sources.map((s) => [s.id, s])),
    [data]
  );

  const [seed, setSeed] = useState(0);
  useEffect(() => {
    setSeed(1 + Math.floor(Math.random() * 2 ** 30));
  }, []);

  // 过滤并按话题多样性排序卡片
  const filteredCards = useMemo(() => {
    const matched = data.cards.filter((card) =>
      card.links.some(
        (link) =>
          (!selectedSource || link.sourceId === selectedSource) &&
          (!selectedTopic || link.topicSlug === selectedTopic)
      )
    );
    return selectedSource || selectedTopic ? matched : diversifyCards(matched, seed);
  }, [data, selectedSource, selectedTopic, seed]);

  const currentCard = filteredCards[cursor % Math.max(1, filteredCards.length)];
  const isFiltering = !!selectedTopic || !!selectedSource;

  // 默认展示最多 3 张卡片（移动端 1 张），如果选中了某个信源/话题则展示该筛选下的全部卡片列表
  const visibleCards = isFiltering
    ? filteredCards
    : currentCard
    ? Array.from(
        { length: Math.min(isMobile ? 1 : 3, filteredCards.length) },
        (_, idx) =>
          filteredCards[(cursor - idx + filteredCards.length) % filteredCards.length]
      )
    : [];

  const isPlaying =
    moving &&
    inView &&
    !hoveredReader &&
    !focusedReader &&
    !touchedPause &&
    !isFiltering &&
    filteredCards.length > 0;

  const [litTopics, setLitTopics] = useState<Set<string>>(() => new Set());
  const allTopicsLit = !moving || isFiltering || topicsExpanded;

  useCardFlipAnimation(
    cardsContainerRef,
    `${isFiltering}:${visibleCards.map((c) => c.id).join(",")}`,
    moving && !isFiltering
  );

  // 有新闻的信源集合
  const activeSourceIds = useMemo(
    () => new Set(filteredCards.flatMap((c) => c.sourceIds)),
    [filteredCards]
  );

  // 信源排序：有新闻的排前面，同级按中文拼音排
  const sortedSources = useMemo(() => {
    const hasAnyCard = new Set(data.cards.flatMap((c) => c.sourceIds));
    return [...allSources].sort(
      (a, b) =>
        Number(hasAnyCard.has(b.id)) - Number(hasAnyCard.has(a.id)) ||
        a.name.localeCompare(b.name, "zh")
    );
  }, [data, allSources]);

  // 统计每个话题下的卡片数
  const topicCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const card of data.cards) {
      for (const slug of card.topicSlugs) {
        counts.set(slug, (counts.get(slug) ?? 0) + 1);
      }
    }
    return counts;
  }, [data]);

  // 话题排序：非公司类话题在前、公司类在后，同组按卡片数量降序
  const sortedTopics = useMemo(() => {
    return [...data.topics]
      .filter(
        (t) =>
          !topicsExpanded ||
          t.name.toLocaleLowerCase().includes(topicQuery.trim().toLocaleLowerCase())
      )
      .sort(
        (a, b) =>
          Number(a.group === "company") - Number(b.group === "company") ||
          (topicCounts.get(b.slug) ?? 0) - (topicCounts.get(a.slug) ?? 0)
      );
  }, [data, topicCounts, topicQuery, topicsExpanded]);

  useEffect(() => {
    setHydrated(true);
    const mq = matchMedia("(max-width:700px)");
    const onMqChange = () => setIsMobile(mq.matches);
    onMqChange();
    mq.addEventListener("change", onMqChange);

    const el = stageRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) =>
      setInView(!!entry?.isIntersecting)
    );
    io.observe(el);
    return () => {
      io.disconnect();
      mq.removeEventListener("change", onMqChange);
    };
  }, []);

  useEffect(() => {
    if (hydrated && inView && (!moving || hoveredReader || focusedReader || touchedPause)) {
      setArrived(true);
    }
  }, [hydrated, inView, moving, hoveredReader, focusedReader, touchedPause]);

  // 启动 Canvas 绘制与粒子动画
  useEffect(() => {
    if (canvasRef.current && stageRef.current) {
      return mountRiverCanvas({
        canvas: canvasRef.current,
        stage: stageRef.current,
        data,
        cards: filteredCards,
        current: currentCard,
        moving: isPlaying,
        lit: allTopicsLit ? null : litTopics,
        clock: clockRef.current,
        cycleKey: `${data.snapshotAt}:${selectedSource}:${selectedTopic}:${cursor}:${currentCard?.id}`,
        onArrival: () => setArrived(true),
        onNext: () => {
          setArrived(filteredCards.length === 1);
          setCursor((c) => c + 1);
        },
      });
    }
  }, [
    data,
    filteredCards,
    currentCard,
    isPlaying,
    topicQuery,
    selectedSource,
    selectedTopic,
    cursor,
    isMobile,
    sourcesExpanded,
    topicsExpanded,
    allTopicsLit,
    litTopics,
  ]);

  const resetFilters = () => {
    setSelectedSource(null);
    setSelectedTopic(null);
    setCursor(0);
    setArrived(true);
    setFocusedReader(false);
    setSourcesExpanded(false);
    setTopicsExpanded(false);
    setTopicQuery("");
  };

  const toggleSource = (id: string) => {
    setSelectedSource(selectedSource === id ? null : id);
    setSourcesExpanded(false);
    setCursor(0);
    setArrived(true);
  };

  const toggleTopic = (slug: string) => {
    setSelectedTopic(selectedTopic === slug ? null : slug);
    setTopicsExpanded(false);
    setCursor(0);
    setArrived(true);
  };

  const stepSize = isMobile ? 1 : 3;
  const forceReveal =
    hydrated && (!moving || hoveredReader || focusedReader || touchedPause);

  // 记录已点亮的话题（随新闻流到达逐个点亮，未点亮的话题带高斯模糊休眠态 data-dormant="true"）
  useEffect(() => {
    const newlyLit = visibleCards
      .filter((_, idx) => forceReveal || (idx === 0 ? arrived : cursor >= idx))
      .flatMap((c) => c.topicSlugs);
    setLitTopics((prev) =>
      newlyLit.some((slug) => !prev.has(slug)) ? new Set([...prev, ...newlyLit]) : prev
    );
  }, [visibleCards, forceReveal, arrived, cursor]);

  return (
    <section
      className="news-river news-river-flow"
      aria-label="赛事流"
      data-playing={isPlaying}
    >
      {/* 顶部标题栏：03 / 新闻流 | 从来源，到话题 */}
      <header className="river-heading">
        <div>
          <span className="river-instrument">03 /</span>
          <span className="river-indicator" />
          <h2>赛事流</h2>
          <span className="river-heading-note">从来源，到分类，到这一场</span>
        </div>
        <a
          href="#board"
          onClick={(e) => {
            e.preventDefault();
            onOpenAll?.(selectedSource, selectedTopic);
          }}
        >
          {selectedSource || selectedTopic ? "在赛程总表中查看" : "打开赛程总表"}
          <span aria-hidden="true">↗</span>
        </a>
      </header>

      {/* 核心三栏舞台 + 底层 Canvas 连线画布 */}
      <div
        ref={stageRef}
        className="river-stage"
        onPointerDown={(e) => {
          if (e.pointerType === "touch") {
            setTouchedPause(true);
            setArrived(true);
          }
        }}
      >
        <canvas ref={canvasRef} className="river-canvas" aria-hidden="true" />

        {/* 左栏：来源 (Sources) */}
        <div className="river-sources" data-expanded={sourcesExpanded}>
          <div className="river-column-heading">
            <span>来源</span>
            <button
              className="river-mobile-toggle"
              aria-expanded={sourcesExpanded}
              onClick={() => setSourcesExpanded(!sourcesExpanded)}
            >
              {sourcesExpanded ? "收起来源" : "展开全部来源"}
            </button>
          </div>

          <div className="river-source-grid" aria-label="来源网站">
            {sortedSources.map((source) => (
              <button
                key={source.id}
                data-river-source={source.id}
                aria-label={source.name}
                title={source.name}
                aria-pressed={selectedSource === source.id}
                className={`${activeSourceIds.has(source.id) ? "has-news" : "is-quiet"} ${
                  currentCard?.sourceIds.includes(source.id) ? "is-current" : ""
                }`}
                onClick={() => toggleSource(source.id)}
              >
                <SourceAvatar
                  name={source.name}
                  iconUrl={source.iconUrl}
                  iconSrcSet={source.iconSrcSet}
                  size={25}
                />
              </button>
            ))}
          </div>

          {/* 左栏底部：当前激活的来源名称胶囊 */}
          <div className="river-source-caption">
            {currentCard?.sourceIds
              .toSorted(
                (a, b) => Number(b === selectedSource) - Number(a === selectedSource)
              )
              .slice(0, 2)
              .map((id) => {
                const source = sourceMap.get(id);
                return source ? (
                  <button
                    key={id}
                    data-river-origin={id}
                    title={source.name}
                    onClick={() => toggleSource(id)}
                  >
                    <SourceAvatar
                      name={source.name}
                      iconUrl={source.iconUrl}
                      iconSrcSet={source.iconSrcSet}
                      size={22}
                    />
                    <span>{source.name}</span>
                  </button>
                ) : null;
              }) ?? "浏览来源网站"}
          </div>
        </div>

        {/* 中栏：话题 (Topics) */}
        <div className="river-topics" data-expanded={topicsExpanded}>
          <div className="river-column-heading">
            <span>分类</span>
            <button
              className="river-mobile-toggle"
              aria-expanded={topicsExpanded}
              onClick={() => setTopicsExpanded(!topicsExpanded)}
            >
              {topicsExpanded ? "收起分类" : "展开全部分类"}
            </button>
          </div>

          {topicsExpanded && (
            <input
              type="search"
              aria-label="查找分类"
              placeholder="查找分类"
              value={topicQuery}
              onChange={(e) => setTopicQuery(e.target.value)}
              className="river-source-search"
            />
          )}

          <div className="river-topic-list">
            <button
              key="__all"
              aria-pressed={!selectedTopic}
              data-selected={!selectedTopic}
              className="is-all"
              onClick={() => setSelectedTopic(null)}
            >
              <i aria-hidden="true" />
              <span>全部</span>
            </button>
            {sortedTopics.map((topic) => {
              const cat =
                TOPIC_CATEGORY_MAP[topic.slug] ??
                (topic.group === "company" ? "company" : "opinion");
              const style = {
                "--river-light": PALETTE.light[cat].join(","),
                "--river-night": PALETTE.dark[cat].join(","),
              } as React.CSSProperties;

              return (
                <button
                  key={topic.slug}
                  data-river-topic={topic.slug}
                  title={topic.name}
                  aria-pressed={selectedTopic === topic.slug}
                  style={style}
                  data-selected={selectedTopic === topic.slug}
                  data-dormant={!allTopicsLit && !litTopics.has(topic.slug)}
                  className={`${topicCounts.has(topic.slug) ? "has-news" : "is-quiet"} ${
                    currentCard?.topicSlugs.includes(topic.slug) ? "is-current" : ""
                  }`}
                  onClick={() => toggleTopic(topic.slug)}
                >
                  <i aria-hidden="true" />
                  <span>{topic.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 右栏：新闻卡片流 (Reader Cards) */}
        <div
          className="river-reader"
          onPointerEnter={() => setHoveredReader(true)}
          onPointerLeave={() => setHoveredReader(false)}
          onFocusCapture={(e) => {
            if (isFocusVisible(e.target)) setFocusedReader(true);
          }}
          onBlurCapture={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              setFocusedReader(false);
            }
          }}
        >
          <div className="river-column-heading">
            <span>
              {selectedTopic
                ? data.topics.find((t) => t.slug === selectedTopic)?.name ?? ""
                : selectedSource
                ? sourceMap.get(selectedSource)?.name
                : "正在汇入"}
              {isFiltering && (
                <small className="river-listing-count">{filteredCards.length} 条</small>
              )}
            </span>

            {(selectedSource || selectedTopic) && (
              <button onClick={resetFilters}>查看全部</button>
            )}

            {(touchedPause || focusedReader) && moving && (
              <button
                onClick={(e) => {
                  e.currentTarget.blur();
                  setTouchedPause(false);
                  setHoveredReader(false);
                  setFocusedReader(false);
                }}
              >
                继续流动
              </button>
            )}
          </div>

          <div
            ref={cardsContainerRef}
            className="river-cards"
            data-listing={isFiltering}
          >
            {visibleCards.map((card, idx) => (
              <article
                key={card.id}
                data-river-card={card.id}
                className={idx === 0 && !isFiltering ? "is-current" : ""}
                data-revealed={true}
              >
                {/* 骨架屏光效（粒子尚未到达前显示） */}
                <span className="river-card-placeholder" aria-hidden="true">
                  <b />
                  <b />
                  <b />
                </span>

                {/* 卡片正文内容 */}
                <div className="river-card-content">
                  <div className="river-card-meta">
                    <div>
                      {card.sourceIds.slice(0, 3).map((sid) => {
                        const s = sourceMap.get(sid);
                        return s ? (
                          <SourceAvatar
                            key={sid}
                            name={s.name}
                            iconUrl={s.iconUrl}
                            iconSrcSet={s.iconSrcSet}
                            size={17}
                          />
                        ) : null;
                      })}
                      <span>
                        {card.sourceIds
                          .map((sid) => sourceMap.get(sid)?.name)
                          .filter(Boolean)
                          .slice(0, 2)
                          .join(" · ")}
                      </span>
                    </div>
                    <time dateTime={card.at}>
                      {new Date(card.at).toLocaleDateString("zh-CN", {
                        timeZone: "Asia/Shanghai",
                        month: "numeric",
                        day: "numeric",
                      })}
                    </time>
                  </div>

                  <h3>
                    <a href={card.href}>{card.title}</a>
                  </h3>

                  <p>{card.summary}</p>

                  <div className="river-card-footer">
                    <span>
                      {card.topicSlugs
                        .map(
                          (slug) =>
                            data.topics.find((t) => t.slug === slug)?.name ?? ""
                        )
                        .filter(Boolean)
                        .slice(0, 2)
                        .join(" · ")}
                    </span>
                    <a href={card.originalUrl} target="_blank" rel="noreferrer">
                      原文 ↗
                    </a>
                  </div>
                </div>
              </article>
            ))}

            {!visibleCards.length && (
              <p className="river-empty">
                {data.snapshotAt ? "这个筛选下还没有赛事。" : "赛事数据正在整理中。"}
                <a href="/zh/featured">阅读新闻 →</a>
              </p>
            )}
          </div>

          {isFiltering && selectedTopic && filteredCards.length > 0 && (
            <a
              className="river-listing-more"
              href={`/zh/featured?topic=${encodeURIComponent(selectedTopic)}`}
            >
              在赛程总表中查看 →
            </a>
          )}

          {!isFiltering && filteredCards.length > (isMobile ? 1 : 3) && (
            <nav className="river-reading-controls" aria-label="浏览新闻卡片">
              <button
                onClick={() =>
                  setCursor(
                    (c) => (c - stepSize + filteredCards.length) % filteredCards.length
                  )
                }
                aria-label={isMobile ? "上一条新闻" : "上一组新闻"}
              >
                ← {isMobile ? "上一条" : "上一组"}
              </button>
              <span>
                {(cursor % filteredCards.length) + 1} / {filteredCards.length}
              </span>
              <button
                onClick={() => setCursor((c) => (c + stepSize) % filteredCards.length)}
                aria-label={isMobile ? "下一条新闻" : "下一组新闻"}
              >
                {isMobile ? "下一条" : "下一组"} →
              </button>
            </nav>
          )}
        </div>
      </div>

      {data.from && data.snapshotAt && (
        <footer className="river-window">
          窗口回顾 ·{" "}
          {new Date(data.from).toLocaleDateString("zh-CN", {
            timeZone: "Asia/Shanghai",
            month: "numeric",
            day: "numeric",
          })}{" "}
          —{" "}
          {new Date(data.snapshotAt).toLocaleDateString("zh-CN", {
            timeZone: "Asia/Shanghai",
            month: "numeric",
            day: "numeric",
          })}
        </footer>
      )}
    </section>
  );
}
