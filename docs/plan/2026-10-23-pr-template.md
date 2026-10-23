# 統一 PR 格式

- 日期：2026-10-23
- Branch：`claude/pr-template`
- PR：#<number>（開 PR 後補上）

## 背景

PR #1～#3 的描述格式都不一樣：#1 是英文，段落也不同；#2 只有 Summary / Test plan；#3 又多了「注意事項」。標題有的用英文，有的照 commit 格式。這樣回頭看很難找到需要的資訊。

## 計畫

- [x] 新增 `.github/pull_request_template.md`，固定五個段落：摘要、改動內容、影響與注意事項、測試、紀錄
- [x] `CLAUDE.md` 新增「PR 格式」規則：標題跟 commit 一樣、段落順序固定、全中文、沒內容寫「無」
- [x] 把 PR #1～#3 的標題和描述改成同一個格式（只改 GitHub 上的文字，不動程式碼）

## 實際改動

- `.github/pull_request_template.md`：PR 範本，GitHub 開 PR 時會自動帶入
- `CLAUDE.md`：新增「PR 格式」段落

和計畫不同的地方：無。

## 影響與注意事項

只動文件，不影響程式行為。之後在 GitHub 網頁開 PR 時，描述會自動帶入範本。
