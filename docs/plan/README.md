# 改動紀錄 (docs/plan)

每個 PR 一份紀錄，檔名 `YYYY-MM-DD-<topic>.md`，跟程式碼放在同一個 PR。

檔名開頭是日期，照檔名排序就是時間順序，所以不另外維護索引（多個 PR 同時開時，共用的索引一定會衝突）。紀錄也不寫狀態，PR 是否 merge 看 GitHub 上的 PR 頁面。

## 範本

```markdown
# <標題>

- 日期：YYYY-MM-DD
- Branch：`<branch>`
- PR：#<number>（開 PR 後補上）

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
