# 部署到 Cloudflare Pages

产物是纯静态的 `dist/`（无后端、无 SSR），Cloudflare Pages 免费额度完全够用。

> 为什么要换：GitHub Pages 在国内访问偏慢，`*.pages.dev` 通常快一截，
> 而且不用备案（服务器在境外）。

---

## 路线 A：拖拽上传（最快，3 分钟，不需要 Git）

适合「先看到东西」。

1. 本地构建一次：

   ```bash
   node node_modules/vite/bin/vite.js build
   ```

2. 打开 https://dash.cloudflare.com/ → 左侧 **Workers & Pages** → **Create** → **Pages** → **Upload assets**

3. 项目名填 `hackathon-board`（决定域名 `hackathon-board.pages.dev`）

4. 把 **`dist` 文件夹整个拖进去** → Deploy

完成。地址形如 `https://hackathon-board.pages.dev`。

**缺点**：以后每次改版都要重新拖一次。

---

## 路线 B：连 Git 仓库（推荐，之后全自动）

适合「以后只 push，不再管部署」。

1. Cloudflare 面板 → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**

2. 授权 GitHub，选仓库 `O789Real/hackathon-board` → Begin setup

3. 构建配置**必须手动填**（自动检测会填错）：

   | 字段 | 值 |
   |---|---|
   | Framework preset | `None` |
   | Build command | `npm install && npm run build` |
   | Build output directory | `dist` |
   | Node version（环境变量） | `NODE_VERSION=22` |

   > 注意是 `npm install` 而不是 `npm ci` —— 仓库里用的是 pnpm，没有 `package-lock.json`。

4. Save and Deploy。

之后：

- 你 `git push` → Cloudflare 自动重新构建发布
- **每天 08:00 的 GitHub Actions 提交了新的 `events.ts` → 也会触发 Cloudflare 重新构建**

两份部署可以并存：GitHub Pages 当备份，`pages.dev` 当主入口。

---

## 路线 C：CI 里直接推（要一个 API Token）

如果你不想让 Cloudflare 自己构建（它每次都要装一遍依赖），
可以让现有的 GitHub Actions 构建一次、同时发两个地方。

1. Cloudflare 面板 → 右上头像 → **My Profile** → **API Tokens** → **Create Token**
   → 模板选 **Edit Cloudflare Workers**（或自定义：`Account.Cloudflare Pages: Edit`）

2. 顺手记下 **Account ID**（面板右侧栏，或 URL 里那串 32 位）

3. 到 GitHub 仓库 → Settings → Secrets and variables → Actions → 加两个：

   | Secret | 值 |
   |---|---|
   | `CLOUDFLARE_API_TOKEN` | 刚才的 token |
   | `CLOUDFLARE_ACCOUNT_ID` | 你的 Account ID |

4. 在 `.github/workflows/deploy.yml` 的 `build` job 末尾、`upload-pages-artifact` 之前加一步：

   ```yaml
       - name: 发布到 Cloudflare Pages
         if: env.CF_TOKEN != ''
         env:
           CF_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
         run: npx wrangler@latest pages deploy dist --project-name=hackathon-board
   ```

   并在该 job 顶部加：

   ```yaml
       env:
         CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
         CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
   ```

没配 secret 时这一步会跳过，不影响 GitHub Pages 那条链路。

---

## 自定义域名（可选）

面板 → 你的 Pages 项目 → **Custom domains** → 添加域名 → 按提示改 DNS。

绑了自有域名就**不能**用 Cloudflare 的免费 `pages.dev` 做备案主体；
如果以后要放国内服务器，才需要 ICP 备案（Pages 不需要）。

---

## 验收清单

部署完打开首页，确认这几条：

- [ ] 深色底（`#121212` 附近），不是白底
      → 白底说明 `<html data-theme="dark">` 丢了
- [ ] 左侧「来源」是一墙彩色圆点，不是一片灰
- [ ] 中间「话题」11 个，能点，点了右侧只剩该话题的比赛
- [ ] 右侧 3 张卡，至少 2 张能看清标题
- [ ] 底部倒计时在跳秒
- [ ] 控制台无红色报错
