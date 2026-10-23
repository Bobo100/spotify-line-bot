# 統一 PR 與 commit 格式

- 日期：2026-10-23
- Branch：`claude/pr-template`
- PR：#4

## 背景

PR #1～#3 的描述格式都不一樣：#1 是英文，段落也不同；#2 只有 Summary / Test plan；#3 又多了「注意事項」。標題有的用英文，有的照 commit 格式。這樣回頭看很難找到需要的資訊。

## 計畫

- [x] 新增 `.github/pull_request_template.md`，固定五個段落：摘要、改動內容、影響與注意事項、測試、紀錄
- [x] `CLAUDE.md` 新增「PR 格式」規則：標題跟 commit 一樣、段落順序固定、全中文、沒內容寫「無」
- [x] 把 PR #1～#3 的標題和描述改成同一個格式（只改 GitHub 上的文字，不動程式碼）
- [x] commit 格式改用 Conventional Commits 1.0，補上 scope、breaking change 寫法和標準 type 清單
- [x] 固定 scope 清單、補 PR 編號的 commit 用語、merge 方式，並把每個 PR 的完整流程寫成步驟
- [x] 新增 `.claude/settings.json`，讓 Claude 的 session 預設用 `Bobo100` 當 commit 作者
- [x] 改寫 `main` 上 PR #1～#3 的 commit：作者從 Claude 改成 `Bobo100`，訊息改成新格式

## 實際改動

- `.github/pull_request_template.md`：PR 範本，GitHub 開 PR 時會自動帶入
- `CLAUDE.md`：新增「PR 格式」段落；「Commit 訊息」改成 Conventional Commits 1.0；新增「每個 PR 的完整流程」；更新作者身分和歷史的規則
- `.claude/settings.json`：設定 `GIT_AUTHOR_*` / `GIT_COMMITTER_*` 環境變數
- `docs/plan/2026-10-22-code-health-fixes.md`：commit type 改成跟改寫後的 commit 一致
- `main` 的歷史（不是透過這個 PR，是直接 force-push）：見下方「改寫 main 的歷史」

和計畫不同的地方：

- 原本只統一 PR 格式，之後加上 commit 格式。原本的 `<type>: <中文摘要>` 已經接近 Conventional Commits，但 `security` 不是標準 type，也沒有 scope 和 breaking change 的寫法，所以補成標準格式；安全性修正改用 `fix`，在內文說明。
- 原本 scope 寫「可省略」，結果同一種 commit 在 #4 寫 `docs:`、在 #5 寫 `docs(plan):`。改成固定清單和固定用語，並把這個 PR 裡補 PR 編號的 commit 改成 `docs(plan):`（branch 還沒 merge，只改寫這個 PR 自己的 commit）
- 每次 merge 方式和步驟都可能不同，所以把完整流程寫成步驟，merge 固定用 merge commit
- 原本決定過往 commit 不重寫。後來發現雲端環境預設的作者 `noreply@anthropic.com` 在 GitHub 上對應到 `claude` 這個帳號，PR #1 的 11 個 commit 會把它列成 contributor，所以改成改寫作者。既然 SHA 一定會變，就順便把這些 commit 的訊息也改成新格式，避免之後為了訊息再改寫一次
- 原本只靠 `CLAUDE.md` 提醒手動指定作者，容易漏掉，所以加上 `.claude/settings.json` 自動套用

## 改寫 main 的歷史

為什麼：PR #1 的 11 個 commit 作者和 committer 是 `Claude <noreply@anthropic.com>`，GitHub 把這個 email 對應到 `claude` 帳號並列成 contributor。

範圍：只改寫 `457103c`（PR #1 之前最後一個 commit）之後的 18 個 commit：

- PR #1 的 11 個 commit：作者、committer 改成 `Bobo100`；訊息改成 Conventional Commits（例如 `security:` 改成 `fix(auth):`、`feat:` 改成 `feat(db)!:` 並補上 `BREAKING CHANGE:`、英文的 Node 版本 commit 改成中文的 `build:`）
- PR #3 的 2 個 commit：訊息補上 scope（`feat(playlist):`、`fix(playlist):`）
- PR #2 的 2 個 commit、#1～#3 的 3 個 merge commit：內容不變，但因為前面的 commit 變了，SHA 跟著改變
- `457103c` 以前的 75 個 commit 完全沒動

驗證（force-push 前）：

- 93 個 commit 的程式碼內容（tree）和時間逐一比對，全部相同
- `457103c` 仍在新的歷史裡，沒動到的 commit 數量是 75
- 新的歷史裡沒有任何 `noreply@anthropic.com`
- 用 `--force-with-lease` 推，確認遠端 `main` 在改寫期間沒有變動
- 推完後用 GitHub API 確認改寫後的 commit 作者顯示為 `Bobo100` 帳號

過程中遇到的問題：

- 一開始這個 clone 是淺層 clone（只有最近 67 個 commit），改寫時會把最舊的那個 commit 當成第一個 commit，切斷更早的歷史。推之前的檢查發現了，抓完整歷史後重做
- 第二次改寫時把整條歷史都跑了一遍，在 GitHub 網頁上做的 commit（例如 `d6ffffe`）帶有 GitHub 的簽章，改寫會拿掉簽章、讓 SHA 改變。改成只改寫 `457103c` 之後的 commit

代價：

- 被改寫的 18 個 commit 失去原本的簽章，GitHub 上不再顯示 Verified（這個雲端環境會自動幫 commit 簽章，GitHub 的 merge 按鈕也會簽章）。之後新的 commit 仍會照常簽章
- PR #1～#3 頁面上還看得到舊的 commit；直接打開舊 SHA 的網址可能還能看到舊內容
- 改寫前開的 PR #4、#5 已經移到新的 `main` 上（內容不變）

## 影響與注意事項

- 只動文件，不影響程式行為
- 之後在 GitHub 網頁開 PR 時，描述會自動帶入範本
- 從這個 PR 之後的 commit 開始用新格式
- **本機的 clone 要重新同步**：`main` 的歷史改過了，在其他電腦上的 clone 要執行 `git fetch origin && git checkout main && git reset --hard origin/main`（會丟掉本機 `main` 上沒推的 commit，執行前先確認）
