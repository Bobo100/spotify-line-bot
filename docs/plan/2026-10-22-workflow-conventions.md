# 開發流程規範：worktree / branch / PR + docs/plan

- 日期：2026-10-22
- Branch：`claude/workflow-conventions`
- PR：#2
- 狀態：進行中

## 背景

之前的改動都直接疊在同一條 branch，也沒有留下文件紀錄，PR merge 後很難回頭看當時為什麼這樣改。

## 計畫

- [x] 新增 `CLAUDE.md`，寫下兩條規範：
  1. 每個改動都走 worktree → branch → PR
  2. 每個 PR 都要在 `docs/plan/` 留紀錄
- [x] 新增 `docs/plan/README.md`（索引 + 範本）
- [x] `.gitignore` 忽略 `.worktrees/`
- [x] 補上 PR #1 的紀錄

## 實際改動

- `CLAUDE.md`：流程規範、commit 格式、常用指令、環境變數清單
- `docs/plan/README.md`：索引與範本
- `docs/plan/2026-10-22-code-health-fixes.md`：補記 PR #1
- `.gitignore`：加入 `/.worktrees`

## 影響與注意事項

只動文件和 `.gitignore`，不影響程式行為。
