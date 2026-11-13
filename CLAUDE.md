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

### 2. 文件放哪

- 新增、重構、移除功能（`feat` / `refactor`）的 PR 在 `docs/<initiative>/plan.md` 開 plan（`<initiative>` 是小寫 kebab-case、不帶日期），格式照 plan-lifecycle 的 plan format 2；每個 commit 標題結尾加 `(<initiative>/W-NN)`。完成的 initiative 整個資料夾搬到 `docs/archive/`。
- 修 bug、升級相依、chore、CI、只改文件的 PR 不寫 plan，背景、驗證和注意事項寫在 PR 描述。
- 功能屬於還開著的 plan 就加項目進那份 plan，不另開；改到 `docs/<topic>.md` 描述的行為或結構時，同一個 PR 更新那份文件。
- 系統現在怎麼運作、改 code 前要知道的限制寫 `docs/<topic>.md`；`docs/` 只放這些、`docs/<initiative>/` 和 `docs/archive/`（`.plan-lint.json` 的 `"docs": 1` 會檢查）。
- 舊的每 PR 一份紀錄（PR #1～#6、#8、#9）封存在 `docs/archive/pr-records/`，唯讀。

### 3. 每個 PR 的完整流程

每次都照這個順序，不跳步驟：

1. 開 worktree 和 branch；要寫 plan 的先寫好 plan 的目標和項目
2. 實作，並驗證（至少 `npx tsc --noEmit`，能測的行為要實際跑過）
3. 跟程式碼一起 commit
4. 開 PR（格式見「PR 格式」）
5. 跑 code review 和對抗性驗證；逐項驗證後修正，沒修的寫明原因
6. 修正後**一定要回頭更新** PR 描述（有 plan 的連同 plan），讓它跟最終程式碼一致；有 plan 的在 merge 前再用一個 commit 補上完成項目的 `Done:` 紀錄（附 PR 編號和驗證結果）
7. merge：一律用 merge commit（不用 squash / rebase），訊息用 GitHub 預設的 `Merge pull request #N from ...`（merge commit 不套用下方的 commit 格式）
8. 收尾：移除 worktree、刪除本機 branch、主 checkout 的 `main` 更新到最新

## PR 格式

- 標題格式和 commit 標題一樣（見下方「Commit 訊息」），type 和 scope 用整個 PR 的主要目的；補 `Done:` 紀錄、review 修正這類附帶的 commit 不影響標題。
- 描述照 `.github/pull_request_template.md` 的段落，順序和標題都不改：`摘要`、`改動內容`、`影響與注意事項`、`測試`、`Plan`。
- 全部用中文；沒有內容的段落寫「無」，不要刪掉。
- `測試` 用 checklist：做過的打勾，還沒做的（例如在 LINE 上實測）留空。
- `影響與注意事項` 也寫這次發現、但不在這個 PR 處理的問題。
- `Plan` 列這個 PR 完成的 `<initiative>/W-NN`；沒有 plan 寫「無」。

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
  - `plan`：只改 `docs/<initiative>/plan.md`
  - 只改流程文件（`CLAUDE.md`、`.github/` 範本）或同時影響多個功能：不寫 scope
- 補 `Done:` 紀錄的 commit 固定寫成：`docs(plan): 補上 <initiative> 的 Done 紀錄 (<initiative>/W-NN)`（plan branch 上的 commit 都要帶這個結尾）。
- 有破壞性變更時，type 後面加 `!`（例如 `feat(db)!:`），並在最後一段寫 `BREAKING CHANGE:` 說明。
- 摘要不加句號，盡量在 50 字以內；內文每行約 72 字元換行。
- 歷史：2026-10-23 已改寫 PR #1～#3 的 commit（作者改成 `Bobo100`、訊息改成這個格式）；更早的 `[what] ...` commit 保留原樣。之後不再改寫 `main` 的歷史。
- commit 不能出現其他貢獻者：不加 `Co-Authored-By` trailer，作者與 committer 都用 `Bobo100 <w150lione@gmail.com>`。
  - `.claude/settings.json` 已經設好 `GIT_AUTHOR_*` / `GIT_COMMITTER_*` 環境變數，並關掉 Claude Code 自動加的 co-author、PR 標記和 session 網址，Claude 的 session 會自動套用。這是個人 repo，所以身分直接寫在共用的設定檔裡
  - commit 前用 `git var GIT_AUTHOR_IDENT` 和 `git var GIT_COMMITTER_IDENT` 確認下一個 commit 會用的身分；不對的話在指令前手動加上這些環境變數，不改 git config
  - 雲端環境預設的 `noreply@anthropic.com` 在 GitHub 上對應到 `claude` 這個帳號，用了就會被列成 contributor
- commit 訊息和 PR 描述都不加任何 Claude 相關標記（例如 `Claude-Session:`、「Generated with Claude Code」）。

## 常用指令

```bash
yarn install          # 本機 Node 不是 24 時加 --ignore-engines
npx tsc --noEmit      # type-check
npm test              # 跑 test/ 底下的測試（用 npm：yarn run 會因為本機 Node 不是 24 而拒絕執行）
yarn vercel           # 本機用 vercel dev 跑（需要先全域安裝 Vercel CLI：npm i -g vercel）
```

## 環境變數

`SPOTIFY_CLIENT_ID`、`SPOTIFY_CLIENT_SECRET`、`LINE_CHANNEL_SECRET`、`LINE_CHANNEL_ACCESS_TOEKN`（拼法照程式）、`LINE_MESSAGING_API`、`BASE_URL`、`COOKIE_SECRET`、`USER_NAME`、`MONGODB_PASSEWORD`、`DATABASE_NAME`、`ENV`
