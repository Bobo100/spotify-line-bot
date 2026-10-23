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

## 實際改動

- `.github/pull_request_template.md`：PR 範本，GitHub 開 PR 時會自動帶入
- `CLAUDE.md`：新增「PR 格式」段落；「Commit 訊息」改成 Conventional Commits 1.0；新增「每個 PR 的完整流程」

和計畫不同的地方：

- 原本只統一 PR 格式，之後加上 commit 格式。原本的 `<type>: <中文摘要>` 已經接近 Conventional Commits，但 `security` 不是標準 type，也沒有 scope 和 breaking change 的寫法，所以補成標準格式；安全性修正改用 `fix`，在內文說明。
- 原本 scope 寫「可省略」，結果同一種 commit 在 #4 寫 `docs:`、在 #5 寫 `docs(plan):`。改成固定清單和固定用語，並把這個 PR 裡補 PR 編號的 commit 改成 `docs(plan):`（branch 還沒 merge，只改寫這個 PR 自己的 commit）
- 每次 merge 方式和步驟都可能不同，所以把完整流程寫成步驟，merge 固定用 merge commit
- 過往 commit 不重寫：改 commit 訊息要重寫 main 的歷史並 force-push，所有 SHA 都會改變，PR #1～#3 裡的 commit 連結和已經存在的 clone 都會對不上。舊的 `[what] ...`、`security: ...` 保留原樣。

## 影響與注意事項

- 只動文件，不影響程式行為
- 之後在 GitHub 網頁開 PR 時，描述會自動帶入範本
- 從這個 PR 之後的 commit 開始用新格式
