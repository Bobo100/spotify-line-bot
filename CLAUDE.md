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

### 3. 每個 PR 的完整流程

每次都照這個順序，不跳步驟：

1. 開 worktree 和 branch，先在 `docs/plan/` 寫好紀錄的「背景」和「計畫」
2. 實作，並驗證（至少 `npx tsc --noEmit`，能測的行為要實際跑過）
3. 把紀錄的計畫打勾、補上「實際改動」和驗證結果，跟程式碼一起 commit
4. 開 PR（格式見「PR 格式」），再用一個 commit 補上紀錄裡的 PR 編號
5. 跑 code review 和對抗性驗證；逐項驗證後修正，沒修的寫明原因
6. 修正後**一定要回頭更新紀錄**（「和計畫不同的地方」、「code review 中不處理的項目」）和 PR 描述，讓兩者跟最終程式碼一致
7. merge：一律用 merge commit（不用 squash / rebase），訊息用 GitHub 預設
8. 收尾：移除 worktree、刪除本機 branch、主 checkout 的 `main` 更新到最新

## PR 格式

- 標題格式和 commit 標題一樣（見下方「Commit 訊息」）。
- 描述照 `.github/pull_request_template.md` 的段落，順序和標題都不改：`摘要`、`改動內容`、`影響與注意事項`、`測試`、`紀錄`。
- 全部用中文；沒有內容的段落寫「無」，不要刪掉。
- `測試` 用 checklist：做過的打勾，還沒做的（例如在 LINE 上實測）留空。
- `紀錄` 放這個 PR 的 `docs/plan/` 檔案路徑。

## Commit 訊息

採用 [Conventional Commits 1.0](https://www.conventionalcommits.org/zh-hant/v1.0.0/)：

```
<type>(<scope>): <中文摘要>

<內文：為什麼改，不只寫改了什麼>

BREAKING CHANGE: <有破壞性變更時才寫>
```

- `type`：
  - `feat`：新功能
  - `fix`：修 bug（安全性修正也用 `fix`，在內文說明）
  - `docs`：只改文件
  - `refactor`：不改變行為的重構
  - `perf`：效能改善
  - `test`：測試
  - `build`：相依套件、建置設定（例如 `package.json`、`tsconfig.json`）
  - `ci`：CI 設定
  - `chore`：其他雜項
  - `revert`：還原先前的 commit
- `scope` 依這次改動主要影響的功能，從下面選一個，不自創：
  - `auth`：登入、token
  - `search`：搜尋
  - `playlist`：歌單、加歌
  - `webhook`：LINE webhook 的分派與指令
  - `db`：MongoDB 資料結構
  - `plan`：只改 `docs/plan/` 的紀錄
  - 只改流程文件（`CLAUDE.md`、`.github/` 範本）或同時影響多個功能：不寫 scope
- 補 PR 編號的 commit 固定寫成：`docs(plan): 補上 <topic> 紀錄的 PR 編號`。
- 有破壞性變更時，type 後面加 `!`（例如 `feat(db)!:`），並在最後一段寫 `BREAKING CHANGE:` 說明。
- 摘要不加句號，盡量在 50 字以內；內文每行約 72 字元換行。
- 2026-10-23 以前的 commit（`[what] ...`、`security: ...` 等）保留原樣，不重寫歷史。
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
