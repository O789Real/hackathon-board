# AGENTS.md

> 给接手这个仓库的 AI 智能体。**先读完这一页再动手。**
> 这里记录的是「代码里看不出来、但踩过就知道疼」的东西。

---

## 这是什么

黑客松聚合看板。三栏：**来源 → 分类 → 赛事**，Canvas 画贝塞尔连线 + 粒子流。
纯静态站，无后端。数据每天由 GitHub Actions 自动抓取并部署。

- 线上：https://o789real.github.io/hackathon-board/
- 技术栈：Vite 6 + React 19 + TypeScript（strict），零 UI 库
- 表现层组件 `NewsRiverFlow` 是逆向复刻件，**不是我们原创**，改动要克制

---

## 三条命令先跑通

```bash
# 依赖（本机 pnpm 不在 PATH，见下）
node node_modules/vite/bin/vite.js dev        # 开发 http://127.0.0.1:5173
node node_modules/vite/bin/tsc --noEmit       # 类型检查（改完必须过）
node node_modules/vite/bin/vite.js build      # 构建到 dist/
```

**这台机器 node / pnpm 不在 PATH 里**，绝对路径：

```
node  E:\deepseekharness\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe
pnpm  E:\deepseekharness\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\pnpm\bin\pnpm.mjs
```

安装依赖必须带镜像源：`--registry=https://registry.npmmirror.com`
（pnpm 11 会拦 esbuild 的构建脚本，但平台二进制在 `node_modules/.pnpm/@esbuild+win32-x64` 里，build 不受影响。）

---

## 提交前必须做的验证

代码能编译 ≠ 页面是对的。这个项目吃过"构建通过但界面全白"的亏。

```
1. tsc --noEmit        退出码 0
2. vite build          成功
3. Playwright 截图      用 channel="msedge"，检查：
                       - body 背景是 rgb(18,18,17) 深色（不是白）
                       - .river-stage 存在
                       - [data-river-source] / [data-river-topic] / [data-river-card] 数量 > 0
                       - 控制台无 error
```

Playwright 用**系统 python**（`python`，不是 DSH 捆绑的那个，捆绑的没装 playwright）。

---

## 绝对不要动的地方（每一条都是踩过的坑）

### 1. `<html data-theme="dark">` 不能删

`index.html` 里的这个属性是硬依赖。`news-river.css` 的 `:root` 定义了**同名变量**（`--bg` / `--ink` / `--surface`）且是浅色值，
它比 `app.css` 后加载 → 删掉属性整站立刻翻白。

### 2. `events.ts` 是生成文件，别手改

| 文件 | 谁写 | 能不能手改 |
|---|---|---|
| `src/data/events.ts` | `scripts/update-events.mjs` | ❌ 下次抓取会覆盖 |
| `src/data/seeds.ts` | 人 | ✅ 国内赛事主要入口 |
| `src/data/topics.ts` | 人 | ✅ |

### 3. 新增话题必须登记颜色

在 `NewsRiverFlow.tsx` 的 `TOPIC_CATEGORY_MAP` 加一行 `slug: "category"`，
`category` 取自 `PALETTE` 已有的键（attack / agent / defense / alignment / eval / incident / governance / tools / opinion / ainews / company）。
不登记 → 那条连线是灰的，且不会报错。

### 4. 这些"看起来像 bug"的地方是刻意为之

| 现象 | 为什么 |
|---|---|
| `data-revealed={true}` 写死 | 原组件要等粒子到达才显影，首屏三张卡全是骨架屏，观感像"网站坏了"。已改成恒显示 |
| 话题休眠是 `blur(0.4px)` | 原值 `blur(2.5px)` 是给 36 个话题设计的，我们只有 11 个，会糊成一片 |
| 卡片内容 `filter: none` | 同上，原来是 `blur(3px)` |
| `base: "./"` | GitHub Pages 部署在 `/仓库名/` 子路径下，绝对路径会 404 |
| 术语用「分类」不是「话题」 | 产品决定，改回去会不一致 |

### 5. Windows 上不要用 PowerShell 字符串函数批量改 HTML

之前这样干过一次，把 `index.html` 写成了 2 字节，靠残留内存恢复的。

**用 `edit` / `write` 工具，或者 python 做精确替换。**

### 6. Vite 的 watch 会因临时文件崩溃

`vite.config.ts` 里 `watch.ignored` 里那几条 `**/.*.tmpdir/**` 不是多余的——
编辑器在项目目录写临时文件时，Vite 会 `EBUSY` 直接退出。删了就会随机崩。

---

## 数据源现状（别浪费时间重试）

| 源 | 结论 |
|---|---|
| Devpost `/api/hackathons?page=N` | ✅ 200，JSON，主力源 |
| itch.io `/jams/in-progress` HTML | ✅ 200，服务端渲染可解析（标题/主办/截止时刻/参加人数）；质量闸门：参加 ≥80 且 365 天内截止，最多取 40 条，全部归 game 分类（2026-11-11 接入，第二个源） |
| Devpost 比赛详情 / 作品 / 技术栈 | ❌ 全部 404 或 403（真浏览器也 403） |
| 活动行 | ❌ 客户端渲染，无结构化数据；所谓 API 返回 404 页 |
| SegmentFault 活动 | ❌ 超时 / 468 反爬 |
| DoraHacks 接口 | ❌ 路径 404（值得再探一次） |

**产品方向已经定了**：国内长尾赛事靠「人工收录 + 用户投稿」，不靠爬。
详见 `路线图.md`。

---

## 当前状态

**已完成（阶段 0）**

- 静态站上线，每天自动抓取 + 部署（23/23 次成功）
- 三栏表现层、粒子连线、分类筛选、倒计时
- 收录 / 导入导出 / localStorage 追踪

**待办**

| 编号 | 内容 |
|---|---|
| B-01 | 获奖作品与技术栈（数据源被封，建议走用户上传） |
| B-02 | 城市字段（地图前提） / 抓取失败告警 / 截止时刻 / 英文按钮 |

**已知问题**

- 「在招」计数只判断有没有截止日，不判断是否已过 → 会虚高 1–2 条
- 抓取任务名义 08:00，实际因 GitHub 排队常在 13:00–14:30 才更新
- 手机上部分 hover 效果依赖 `pointer:coarse` 覆盖，改动时注意别破坏

---

## 部署

推到 `main` 即自动构建发布（`.github/workflows/deploy.yml`）：

```
schedule (每天 UTC 00:00) / push / 手动 workflow_dispatch
  → 抓取数据 → 提交 events.ts → tsc + build → GitHub Pages
```

抓取少于 5 条会主动退出、不覆盖旧数据（防限流洗空线上）。

---

## 工作习惯

- 一个改动一个提交，commit message 写清「为什么」
- 改完 UI 必须截图自查，不能只看编译通过
- 涉及产品方向的改动，先更新 `路线图.md` 再动代码
