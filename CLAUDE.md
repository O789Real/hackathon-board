# CLAUDE.md

本项目的智能体操作说明写在 **[AGENTS.md](./AGENTS.md)**，请先完整读一遍再动手。

要点速览（详细内容和原因都在 AGENTS.md）：

- 三条命令：`tsc --noEmit` → `vite build` → Playwright 截图自查
- `<html data-theme="dark">` 不能删（删了整站翻白）
- `src/data/events.ts` 是自动生成的，别手改；要加国内赛事改 `seeds.ts`
- 新增分类必须在 `NewsRiverFlow.tsx` 的 `TOPIC_CATEGORY_MAP` 登记
- 国内数据源抓不到（已实测），方向是"人工收录 + 用户投稿"
