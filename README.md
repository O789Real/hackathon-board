# 赛道板 · HACKATHON BOARD

黑客松聚合看板。表现层（三栏 + Canvas 连线 + 彗星粒子 + 卡片骨架揭晓）来自对
`aisafetyhot.com` 的逆向复刻组件 `NewsRiverFlow`，数据层与赛程页是本项目自己的。

---

## 跑起来

双击 `启动.cmd`（首次会自动装依赖），然后打开 **http://127.0.0.1:5173**

手动命令：

```bash
node node_modules/vite/bin/vite.js dev      # 开发（热更新）
node node_modules/vite/bin/vite.js build    # 生产构建到 dist/
```

> 这台机器的 node/pnpm 不在 PATH 里，`启动.cmd` 里写死了绝对路径。

---

## 结构

```
src/
├─ main.tsx / App.tsx      壳层 + 全局状态（视图、我的追踪、自定义赛事）
├─ types.ts                EventRec / Mine / Filters 契约
├─ data/
│  ├─ events.ts            27 条 Devpost 实时（脚本生成，别手改）
│  ├─ seeds.ts             31 条人工核对的常设赛事
│  └─ topics.ts            11 个话题 + 语义色
├─ lib/
│  ├─ time.ts              截止日 / 倒计时文案
│  ├─ model.ts             筛选、排序、来源×话题权重
│  ├─ storage.ts           localStorage v3 + 备份格式
│  └─ avatar.ts            名字哈希 → 头像配色
├─ components/
│  ├─ NewsRiver/           ★ 表现层（逆向复刻，勿随意改）
│  │  ├─ NewsRiverFlow.tsx 三栏 + Canvas 粒子引擎
│  │  ├─ news-river.css    自带深浅两套令牌
│  │  └─ adapter.ts        EventRec → OverviewData 的翻译层
│  ├─ Overview/            总览页（river + 倒计时）
│  └─ Board/               赛程总表
└─ styles/app.css          站级令牌与布局
```

### 两个必须知道的约束

1. **`<html data-theme="dark">` 是硬性的。**
   `news-river.css` 的 `:root` 默认是浅色，且会覆盖 `--bg / --ink` 等同名变量。
   去掉 `data-theme` 整页会翻白。

2. **话题配色走它的调色板。**
   要在 `NewsRiverFlow.tsx` 的 `TOPIC_CATEGORY_MAP` 里登记话题 slug，
   否则新话题拿不到颜色。现有 11 个已映射到它既有的 11 个语义色。

---

## 数据刷新

`src/data/events.ts` 目前是手动生成的快照。要变成每天自动：

1. 把 `hackathon-board/_fetch_dev.py` 改成直接输出 `src/data/events.ts`
2. 挂 GitHub Actions，每天 08:00 跑一次并提交

---

## 已知边界

- 追踪状态存在浏览器 localStorage，**不跨设备**
- 只有 Devpost 一个数据源
- 没有后端、没有账号、没有部署配置
- `English` 按钮是占位，未实现
