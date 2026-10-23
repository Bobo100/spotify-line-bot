# 修正加入歌單時送出的 position

- 日期：2026-10-23
- Branch：`claude/fix-append-position`
- PR：#<number>（開 PR 後補上）

## 背景

搜尋結果每首歌有兩個按鈕：INSERT（加到第一首）和 APPEND（加到最後一首）。

- APPEND 的 postback 資料是用字串樣板組的，`position: null` 會變成 `position=null`，最後送給 Spotify 的是字串 `"null"`
- INSERT 送的是字串 `"0"`，也是原樣傳給 Spotify

Spotify `POST /v1/playlists/{id}/tracks` 的 `position` 要整數，所以兩個按鈕都可能失敗。這是 PR #3 開發時發現的問題。

## 計畫

- [x] `lineUtils.generateAddTrackPostbackButton` 改用 `URLSearchParams` 組資料，`position` 是 null 時不放這個欄位（順便讓 `uri` 正確編碼）
- [x] `addTrackToPlaylist` 只在 `position` 能解析成非負整數時才送，並且送數字
- [x] 已經發給使用者的舊訊息裡的按鈕還是 `position=null`，要能當成「加到最後一首」處理

## 實際改動

- `src/utils/lineUtils.ts`：`generateAddTrackPostbackButton` 改用 `URLSearchParams` 組 postback 資料，`position` 是 null 時不放這個欄位
- `src/services/spotify/playlist.ts`：新增 `parsePosition`，只有非負整數才送出 `position`，而且送數字；`"null"`、負數、小數、非數字都當成加到最後一首

和計畫不同的地方：原本只打算修 APPEND，實作時發現 INSERT 送的字串 `"0"` 也有同樣問題，一起修。

驗證：

- `npx tsc --noEmit` 通過
- 用假的 MongoDB / Spotify 跑 4 項檢查，全部通過：按鈕資料（INSERT 有 `position=0`、APPEND 沒有 `position`、`uri` 編碼後能還原）、從按鈕到送給 Spotify 的內容（INSERT 送數字 0、APPEND 不送）、舊訊息的 `"null"`、各種無效值
- 尚未在真的 LINE / Spotify 上實測

## 影響與注意事項

- 不需要新的環境變數，也不需要重新登入
- 已經發出去的舊搜尋結果，按 APPEND 也會正常加到最後一首
