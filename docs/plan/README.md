# 改動紀錄 (docs/plan)

每個 PR 一份紀錄，檔名 `YYYY-MM-DD-<topic>.md`。新紀錄加在索引最上面。

## 索引

| 日期 | 主題 | PR | 狀態 |
|---|---|---|---|
| 2026-10-22 | [開發流程規範：worktree / branch / PR + docs/plan](2026-10-22-workflow-conventions.md) | #2 | 進行中 |
| 2026-10-22 | [程式碼健檢：bug、安全性、多用戶 schema](2026-10-22-code-health-fixes.md) | #1 | 已 merge |

## 範本

```markdown
# <標題>

- 日期：YYYY-MM-DD
- Branch：`<branch>`
- PR：#<number>
- 狀態：計畫中 / 進行中 / 已 merge / 已放棄

## 背景
為什麼要做這件事。

## 計畫
- [ ] 步驟一
- [ ] 步驟二

## 實際改動
做完後補上：改了哪些檔案、和計畫不同的地方。

## 影響與注意事項
Breaking change、需要新增的環境變數、部署步驟等。
```
