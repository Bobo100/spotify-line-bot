# 修正加入歌單時送出的 position

- 日期：2026-10-23
- Branch：`claude/fix-append-position`
- PR：#5

## 背景

搜尋結果每首歌有兩個按鈕：INSERT（加到第一首）和 APPEND（加到最後一首）。

- APPEND 的 postback 資料是用字串樣板組的，`position: null` 會變成 `position=null`，最後送給 Spotify 的是字串 `"null"`
- INSERT 送的是字串 `"0"`，也是原樣傳給 Spotify

Spotify `POST /v1/playlists/{id}/tracks` 的 `position` 要整數，所以兩個按鈕都可能失敗。這是 PR #3 開發時發現的問題。

## 計畫

- [x] `lineUtils.generateAddTrackPostbackButton` 改用 `URLSearchParams` 組資料，`position` 是 null 時不放這個欄位（順便讓 `uri` 正確編碼）
- [x] `addTrackToPlaylist` 只在 `position` 是非負整數時才送，並且送數字；其他無效值回錯誤
- [x] 已經發給使用者的舊訊息裡的按鈕還是 `position=null`，要能當成「加到最後一首」處理

## 實際改動

- `src/utils/lineUtils.ts`：`generateAddTrackPostbackButton` 改用 `URLSearchParams` 組 postback 資料，參數補上型別；INSERT 傳數字 `0`，APPEND 不傳 `position`
- `src/services/spotify/playlist.ts`：新增 `parsePosition`
  - 沒給、空字串、舊訊息的 `"null"`：加到最後一首
  - 純數字字串或非負整數：送數字給 Spotify
  - 其他（空白、負數、小數、`0x10`、`1e2` 等）：回錯誤「position 必須是 0 以上的整數」，不呼叫 Spotify

和計畫不同的地方：

- 原本只打算修 APPEND，實作時發現 INSERT 送的字串 `"0"` 也有同樣問題，一起修
- code review 後：原本所有無效值都默默改成加到最後一首，對外的 REST route 會因此把呼叫端的錯誤藏起來；`Number()` 也會把空白當成 0、接受 `0x10` 這類寫法。改成只把舊訊息的 `"null"` 當成加到最後一首，其他無效值回錯誤，並改用純數字檢查

驗證：

- `npx tsc --noEmit` 通過
- 用假的 MongoDB / Spotify 跑 4 項檢查，全部通過：按鈕資料（INSERT 有 `position=0`、APPEND 沒有 `position`、`uri` 編碼後能還原）、從按鈕到送給 Spotify 的內容（INSERT 送數字 0、APPEND 不送）、舊訊息的 `"null"`、12 種無效值都回錯誤且不呼叫 Spotify
- 尚未在真的 LINE / Spotify 上實測

## 影響與注意事項

- 不需要新的環境變數，也不需要重新登入
- 已經發出去的舊搜尋結果，按 APPEND 也會正常加到最後一首
- 對外的 `POST /playlist/add` 收到無效的 `position` 會回 400（原本會送給 Spotify，由 Spotify 回錯誤）

## code review 中不處理的項目

- 「翻頁按鈕也沒編碼」：屬實，但是另一個既有問題（翻頁目前靠 webhook 的補救寫法能用，關鍵字含 `&`、`+` 時會壞），另外處理
- 「編碼後的資料會接近 LINE 300 字元上限」：實際只有約 70 字元，搜尋也只會產生 track URI，不處理
- 「commit 用了 scope，不符合 `CLAUDE.md`」：這個 branch 的 `CLAUDE.md` 是舊版，PR #4 的新規則（Conventional Commits）允許 scope。PR #4 要比這個 PR 先 merge
