# 統一 PR 與 commit 規範並預設 commit 作者

- 日期：2026-10-23
- Branch：`claude/pr-template`
- PR：#4

## 背景

PR #1～#3 的描述格式都不一樣：#1 是英文，段落也不同；#2 只有 Summary / Test plan；#3 又多了「注意事項」。標題有的用英文，有的照 commit 格式。commit 和 `docs/plan/` 紀錄的格式也各次不同，回頭看很難找到需要的資訊。

## 計畫

- [x] 新增 `.github/pull_request_template.md`，固定五個段落：摘要、改動內容、影響與注意事項、測試、紀錄
- [x] `CLAUDE.md` 新增「PR 格式」規則：標題跟 commit 一樣、段落順序固定、全中文、沒內容寫「無」
- [x] 把 PR #1～#3 的標題和描述改成同一個格式（只改 GitHub 上的文字，不動程式碼）
- [x] commit 格式改用 Conventional Commits 1.0，補上 scope、breaking change 寫法和標準 type 清單
- [x] 固定 scope 清單、補 PR 編號的 commit 用語、merge 方式，並把每個 PR 的完整流程寫成步驟
- [x] `docs/plan/` 紀錄固定 8 個段落，並把現有紀錄整理成同一個結構
- [x] 新增 `.claude/settings.json`，讓 Claude 的 session 預設用 `Bobo100` 當 commit 作者，並關掉 Claude Code 自動加的標記
- [x] 改寫 `main` 上 PR #1～#3 的 commit：作者從 Claude 改成 `Bobo100`，訊息改成新格式

## 實際改動

- `.github/pull_request_template.md`：PR 範本，GitHub 開 PR 時會自動帶入
- `CLAUDE.md`：
  - 新增「每個 PR 的完整流程」（寫計畫 → 實作驗證 → 更新紀錄 → 開 PR → review → 修正後回頭更新紀錄和 PR 描述 → merge → 收尾）
  - 新增「PR 格式」；標題用整個 PR 的主要 type 和 scope
  - 「Commit 訊息」改成 Conventional Commits 1.0，固定 scope 清單；merge commit 用 GitHub 預設訊息、不套用 commit 格式
  - 更新作者身分規則：commit 前用 `git var GIT_AUTHOR_IDENT` / `GIT_COMMITTER_IDENT` 確認
- `.claude/settings.json`：設定 `GIT_AUTHOR_*` / `GIT_COMMITTER_*` 環境變數，並用 `attribution` 關掉 Claude Code 自動加的 co-author、PR 標記和 session 網址
- `docs/plan/README.md`：範本改成固定 8 個段落
- 現有紀錄整理成 8 段結構（內容不變）：`2026-10-22-code-health-fixes.md`、`2026-10-22-workflow-conventions.md`、`2026-10-22-playlist-select.md`；`code-health-fixes.md` 的 commit type 也改成跟改寫後的 commit 一致
- `main` 的歷史（不是透過這個 PR，是直接 force-push）：
  - 只改寫 `457103c`（PR #1 之前最後一個 commit）之後的 18 個 commit；更早的 75 個 commit 完全沒動
  - PR #1 的 11 個 commit：作者、committer 改成 `Bobo100`；訊息改成 Conventional Commits（例如 `security:` 改成 `fix(auth):`、`feat:` 改成 `feat(db)!:` 並補上 `BREAKING CHANGE:`、英文的 Node 版本 commit 改成中文的 `build:`）
  - PR #3 的 2 個 commit：訊息補上 scope（`feat(playlist):`、`fix(playlist):`）
  - PR #2 的 2 個 commit、#1～#3 的 3 個 merge commit：內容不變，但因為前面的 commit 變了，SHA 跟著改變
  - 改寫前開的 PR #4、#5 移到新的 `main` 上（內容不變）

## 和計畫不同的地方

- 原本只統一 PR 格式，之後加上 commit 格式。原本的 `<type>: <中文摘要>` 已經接近 Conventional Commits，但 `security` 不是標準 type，也沒有 scope 和 breaking change 的寫法，所以補成標準格式；安全性修正改用 `fix`，在內文說明
- 原本 scope 寫「可省略」，結果同一種 commit 在 #4 寫 `docs:`、在 #5 寫 `docs(plan):`。改成固定清單和固定用語，並把這個 PR 裡補 PR 編號的 commit 改成 `docs(plan):`
- 每次 merge 方式和步驟都可能不同，所以把完整流程寫成步驟，merge 固定用 merge commit
- 原本決定過往 commit 不重寫。後來發現雲端環境預設的作者 `noreply@anthropic.com` 在 GitHub 上對應到 `claude` 這個帳號，PR #1 的 11 個 commit 會把它列成 contributor，所以改成改寫作者。既然 SHA 一定會變，就順便把這些 commit 的訊息也改成新格式，避免之後為了訊息再改寫一次
- 原本只靠 `CLAUDE.md` 提醒手動指定作者，容易漏掉，所以加上 `.claude/settings.json` 自動套用
- 改寫歷史的過程中遇到兩個問題，都在 force-push 前的檢查發現：
  - 這個 clone 一開始是淺層 clone（只有最近 67 個 commit），改寫會把最舊的那個 commit 當成第一個 commit，切斷更早的歷史。抓完整歷史後重做
  - 第二次改寫跑了整條歷史，在 GitHub 網頁上做的 commit（例如 `d6ffffe`）帶有 GitHub 的簽章，改寫會拿掉簽章、讓 SHA 改變。改成只改寫 `457103c` 之後的 commit
- code review 後：
  - 只設定作者不夠，Claude Code 預設還會加上 co-author、PR 標記和 session 網址，所以在設定檔加上 `attribution`（`commit`、`pr` 設成空字串，`sessionUrl` 設成 `false`）
  - 確認身分的指令原本寫 `git log -1`，但它看的是上一個 commit，改成 `git var`
  - 範本沒有「驗證」「code review 中不處理的項目」等段落，各紀錄自己取名，所以固定成 8 段
  - 補上 merge commit 不套用 commit 格式的例外，以及多種 type 的 PR 要怎麼取標題
  - 重新同步的說明補上舊 `main` 上開出來的 branch

## 驗證

- 改寫歷史（force-push 前）：
  - 93 個 commit 的程式碼內容（tree）和時間逐一比對，全部相同
  - `457103c` 仍在新的歷史裡，沒動到的 commit 數量是 75
  - 新的歷史裡沒有任何 `noreply@anthropic.com`
  - 用 `--force-with-lease` 推，確認遠端 `main` 在改寫期間沒有變動
- 推完後用 GitHub API 確認改寫後的 commit 作者顯示為 `Bobo100` 帳號
- PR #4、#5 移到新的 `main` 後，檔案內容跟移動前逐一比對相同；PR #5 的 `npx tsc --noEmit` 通過
- `.claude/settings.json` 是合法的 JSON；`attribution` 的寫法對照 Claude Code 官方文件確認
- code review + 對抗性驗證：8 項中 6 項已修，2 項說明不處理的原因
- 尚未在新的 session 實際確認 `.claude/settings.json` 生效（設定在 session 啟動時才會載入）

## 影響與注意事項

- 程式行為沒有改變
- 之後在 GitHub 網頁開 PR 時，描述會自動帶入範本
- 從這個 PR 之後的 commit 開始用新格式
- **其他電腦上的 clone 要重新同步**，因為 `main` 的歷史改過了：
  - `main`：`git fetch origin && git checkout main && git reset --hard origin/main`（會丟掉本機 `main` 上沒推的 commit，執行前先確認）
  - 從舊 `main` 開出來、還沒 merge 的 branch：`git rebase --onto origin/main d559dec <branch>`（`d559dec` 是改寫前的 `main`），不然 push 後會把舊的 commit 帶回來
- 被改寫的 18 個 commit 失去原本的簽章，GitHub 上不再顯示 Verified（這個雲端環境會自動幫 commit 簽章，GitHub 的 merge 按鈕也會簽章）。之後新的 commit 照常簽章
- PR #1～#3 頁面上還看得到舊的 commit；直接打開舊 SHA 的網址可能還能看到舊內容

## code review 中不處理的項目

- 「設定檔把一個人的身分寫死，其他協作者也會被套用」：這是個人 repo；改放 gitignore 的 `.claude/settings.local.json` 的話，雲端 session 每次都是重新 clone，設定不會存在，就失去作用
- 「PR #1 紀錄第 8 項改了 `package.json`，應該是 `build`」：那個 commit 同時改了相依套件和 cookie secret，不只是建置設定，所以用 `chore`；紀錄跟 commit 一致，不再為此改寫歷史

## 後續待辦

無
