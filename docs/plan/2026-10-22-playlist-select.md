# LINE 指令選擇要加入的歌單

- 日期：2026-10-22
- Branch：`claude/playlist-select`
- PR：#<number>（開 PR 後補上）

## 背景

`addTrackToPlaylist` 會從 MongoDB 讀使用者的 `playlistId`，但目前沒有任何地方可以設定它。新使用者登入後按「加入歌單」一定失敗，只會看到「playlist_id 尚未設定」。

## 計畫

- [x] 在 LINE 輸入「歌單」（或 `playlists`），bot 回一則訊息，下方用 quick reply 按鈕列出可以加歌的歌單
  - 只列使用者自己的歌單和共同編輯的歌單；別人的歌單即使有追蹤也無法加歌
  - quick reply 最多 13 個按鈕；按鈕文字最多 20 字，超過就截斷
  - 訊息內文顯示目前選的是哪個歌單
- [x] 按下按鈕（postback `SELECT_PLAYLIST`）後，先確認該歌單確實在使用者可寫入的清單裡，再存進 MongoDB，回覆「已設定歌單：<名稱>」
- [x] 還沒選歌單就按「加入歌單」時，提示使用者輸入「歌單」來選擇
- [x] 沒有可寫入的歌單時，提示使用者先到 Spotify 建立一個

## 實際改動

- `src/services/spotify/playlist.ts`
  - 新增 `listWritablePlaylists`：呼叫 `GET /v1/me/playlists?limit=50`，只留 owner 是自己或 `collaborative` 的歌單
  - 新增 `selectPlaylist`：確認 id 在可寫入清單裡才存進 MongoDB，並回傳歌單名稱
  - `addTrackToPlaylist` 沒選歌單時的錯誤訊息改成提示輸入「歌單」
- `src/utils/lineUtils.ts`：新增 `generatePlaylistQuickReply`，處理 13 個按鈕上限、20 字截斷（以字元計，emoji 不會被切壞）、空白歌單名稱
- `src/utils/lineType.ts`：新增 `SELECT_PLAYLIST` action
- `src/route/webhook.ts`：文字指令「歌單」/`playlists`/`playlist`，以及 `SELECT_PLAYLIST` postback

和計畫不同的地方：無。

驗證：`npx tsc --noEmit` 通過；另外用假的 MongoDB / Spotify 回應跑了 8 項行為檢查（過濾規則、未選歌單提示、拒絕非自己的歌單、Spotify 錯誤、未連結帳號、按鈕數量與文字截斷、postback 資料能正確解析、空白名稱），全部通過。尚未在真的 LINE / Spotify 上實測。

限制：只讀前 50 個歌單，超過 50 個的使用者看不到後面的歌單。

## 影響與注意事項

- 輸入「歌單」或 `playlists` 會被當成指令，不會拿去搜尋歌曲
- 不需要新的環境變數或 Spotify 權限（登入時已經要求 `playlist-read-private`）

## 發現但不在這個 PR 處理

- 搜尋結果的「APPEND」按鈕在 `lineUtils.generateAddTrackPostbackButton` 裡會把 `position` 組成字串 `"null"`，`addTrackToPlaylist` 會把它當成有效值送給 Spotify，加到最後一首可能失敗。另開 PR 修。
