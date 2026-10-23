# 開發流程規範：worktree / branch / PR + docs/plan

- 日期：2026-10-22
- Branch：`claude/workflow-conventions`
- PR：#2

## 背景

之前的改動都直接疊在同一條 branch，也沒有留下文件紀錄，PR merge 後很難回頭看當時為什麼這樣改。

## 計畫

- [x] 新增 `CLAUDE.md`，寫下規範：
  1. 每個改動都走 worktree → branch → PR
  2. 每個 PR 都要在 `docs/plan/` 留紀錄
  3. commit 不出現其他貢獻者，commit 和 PR 都不加 Claude 相關標記
- [x] 新增 `docs/plan/README.md`（說明 + 範本）
- [x] `.gitignore` 忽略 `.worktrees/`
- [x] 補上 PR #1 的紀錄

## 實際改動

- `CLAUDE.md`：流程規範、commit 規則、常用指令、環境變數清單
- `docs/plan/README.md`：說明與範本
- `docs/plan/2026-10-22-code-health-fixes.md`：補記 PR #1
- `.gitignore`：加入 `/.worktrees`

## 和計畫不同的地方

code review 後調整：

- 原本 `docs/plan/README.md` 有一張共用索引表，每個 PR 都要在最上面加一行。多個 PR 同時開時這行一定會衝突，所以拿掉索引，改成靠檔名日期排序。
- 原本紀錄有「狀態」欄位，但紀錄跟程式碼在同一個 PR，merge 後沒辦法再改成「已 merge」，所以拿掉，狀態看 GitHub。
- Branch 命名改成：手動開的用 `<type>/<topic>`，Claude 開的用 `claude/<topic>`，跟這個 PR 的 branch 名稱一致。
- 收尾步驟補上刪除本機 branch。

## 驗證

- 在主 checkout 跑 `tsc --listFilesOnly`，確認 tsc 不會讀到 `.worktrees/` 裡的檔案（TypeScript 預設跳過 `.` 開頭的資料夾）
- code review + 對抗性驗證：8 項中 6 項已修，2 項驗證為誤報

## 影響與注意事項

只動文件和 `.gitignore`，不影響程式行為。

## code review 中不處理的項目

- 「tsc 會把 `.worktrees/` 裡的程式也一起檢查」：誤報，實測 tsc 只讀到主線自己的檔案
- 「PR 編號是猜的」：誤報，遠端確實有 PR #2

## 後續待辦

無
