# CLAUDE.md

LINE Bot 控制 Spotify 的 side project：Fastify (serverless on Vercel) + MongoDB + LINE Messaging API + Spotify Web API。

## 開發流程規範

### 1. 每個改動都走 worktree → branch → PR

- 不直接在 `main` 或主 checkout 上改。每個改動開一個獨立 worktree 與 branch：
  ```bash
  git fetch origin main
  git worktree add .worktrees/<topic> -b <branch> origin/main
  ```
  `.worktrees/` 已在 `.gitignore`。
- Branch 命名：手動開的用 `<type>/<topic>`，例如 `feat/playlist-select`、`fix/token-refresh`；Claude 開的用 `claude/<topic>`。
- 一個 PR 只做一件事；PR 內可拆多個小 commit。
- PR merge 後該 branch 不再重用，後續改動另開新 branch / worktree。
- 收尾（PR merge 後）：
  ```bash
  git worktree remove .worktrees/<topic>
  git branch -d <branch>
  ```

### 2. 改動要記錄在 `docs/plan/`

- 每個 PR 都要在 `docs/plan/` 新增（或更新）一份紀錄，跟程式碼放在同一個 PR。
- 檔名：`YYYY-MM-DD-<topic>.md`，格式照 `docs/plan/README.md` 的範本。檔名開頭是日期，照檔名排序就是時間順序，不另外維護索引。
- 紀錄不寫狀態欄位；PR 是否 merge 看 GitHub 上的 PR 頁面。
- 實作途中計畫改變時，更新同一份紀錄，不另開新檔。

## PR 格式

- 標題和 commit 一樣：`<type>: <中文摘要>`。
- 描述照 `.github/pull_request_template.md` 的段落，順序和標題都不改：`摘要`、`改動內容`、`影響與注意事項`、`測試`、`紀錄`。
- 全部用中文；沒有內容的段落寫「無」，不要刪掉。
- `測試` 用 checklist：做過的打勾，還沒做的（例如在 LINE 上實測）留空。
- `紀錄` 放這個 PR 的 `docs/plan/` 檔案路徑。

## Commit 訊息

- 格式：`<type>: <中文摘要>`，type 用 `feat` / `fix` / `refactor` / `security` / `chore` / `docs`。
- 內文寫「為什麼改」，不只寫「改了什麼」。
- commit 不能出現其他貢獻者：不加 `Co-Authored-By` trailer，作者與 committer 都用 `Bobo100 <w150lione@gmail.com>`（用 `GIT_AUTHOR_*` / `GIT_COMMITTER_*` 環境變數指定，不改 git config）。
- commit 訊息和 PR 描述都不加任何 Claude 相關標記（例如 `Claude-Session:`、「Generated with Claude Code」）。

## 常用指令

```bash
yarn install          # 本機 Node 不是 24 時加 --ignore-engines
npx tsc --noEmit      # type-check
yarn vercel           # 本機用 vercel dev 跑（需要先全域安裝 Vercel CLI：npm i -g vercel）
```

## 環境變數

`SPOTIFY_CLIENT_ID`、`SPOTIFY_CLIENT_SECRET`、`LINE_CHANNEL_SECRET`、`LINE_CHANNEL_ACCESS_TOEKN`（拼法照程式）、`LINE_MESSAGING_API`、`BASE_URL`、`COOKIE_SECRET`、`USER_NAME`、`MONGODB_PASSEWORD`、`DATABASE_NAME`、`ENV`
