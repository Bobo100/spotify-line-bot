# LINE 指令選擇要加入的歌單

- 日期：2026-10-22
- Branch：`claude/playlist-select`
- PR：#3

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
  - 新增 `selectPlaylist`：先檢查 id 格式，再用 `GET /v1/playlists/{id}` 查這一個歌單，確認可寫入才存進 MongoDB
  - MongoDB 沒有 Spotify user id 時（登入時抓 profile 失敗）會補抓一次
  - Spotify 回 401 時改成提示輸入 `login` 重新登入，不直接顯示英文錯誤
  - `addTrackToPlaylist` 沒選歌單時的錯誤訊息改成提示輸入「歌單」
- `src/utils/lineUtils.ts`
  - 新增 `generatePlaylistQuickReply`：13 個按鈕上限、按鈕文字最多 20 字、空白歌單名稱、目前歌單不在清單中的提示
  - 截斷以完整字形為單位，且 UTF-16 長度也不超過 20，不會切開組合 emoji（例如 👨‍👩‍👧、🇹🇼）
  - `replayMessage` 在 LINE 拒收訊息時記錄狀態碼和回應內容（原本完全沒有 log）
- `src/utils/lineType.ts`：新增 `SELECT_PLAYLIST` action
- `src/route/webhook.ts`
  - 文字指令「歌單」/`playlists`/`playlist`，以及 `SELECT_PLAYLIST` postback
  - 每個事件各自攔錯誤：出錯時回覆「發生錯誤，請稍後再試」並記 log，同一批的其他事件照常處理（原本任何一個事件出錯，整個 webhook 回 500）
- `src/route/spotify.ts`：登入權限加上 `playlist-read-collaborative`，並把不存在的 `playlist-modify` 改成 `playlist-modify-public`

## 和計畫不同的地方

code review 後調整：

- 選歌單原本是重抓整份清單再比對 id，改成直接查單一歌單，也能選到前 50 個以外的歌單
- 計畫寫「不需要新的 Spotify 權限」是錯的：沒有 `playlist-read-collaborative`，Spotify 不會回傳別人建立的共編歌單；沒有 `playlist-modify-public`，加歌到自己的公開歌單會被拒絕
- 補上上面列的錯誤處理（補抓 user id、401 提示重新登入、事件錯誤隔離、LINE 拒收時記 log）

## 驗證

- `npx tsc --noEmit` 通過
- 用假的 MongoDB / Spotify 回應跑 11 項行為檢查，全部通過：過濾規則、未選歌單提示、拒絕非自己的歌單、用 id 選前 50 個以外的歌單（只發一次請求）、格式錯誤的 id 不發請求、404、401 提示重新登入、補抓 user id、補抓失敗、按鈕數量與截斷（含組合 emoji、中文）、目前歌單不在清單中
- 用 Fastify 送一批簽章正確的 webhook：第一個事件讓 Spotify 請求丟出例外，回應仍是 200、使用者收到錯誤提示、第二個事件照常處理
- code review + 對抗性驗證：10 項中 8 項已修，2 項說明不處理的原因
- 尚未在真的 LINE / Spotify 上實測

## 影響與注意事項

- 輸入「歌單」、`playlists`、`playlist`（不分大小寫）會被當成指令，不會拿去搜尋歌曲
- 登入權限有變：已登入的使用者要重新輸入 `login` 授權一次，才看得到別人建立的共編歌單、才能加歌到自己的公開歌單。沒重新授權的話，自己的私人歌單照常可用
- 清單只列前 50 個歌單（但可以選到之後的歌單，例如從其他地方取得的 id）
- 不需要新的環境變數

## code review 中不處理的項目

- 「有兩個列歌單的函式」：舊的 `listPlaylists` 只給 `/playlist/playlists` 這個測試用 HTTP route 使用，合併會改到那個 route 的回傳內容，不在這個 PR 處理
- 「同一份 MongoDB 資料被讀好幾次」：這次只把讀目前歌單改成跟 Spotify 請求並行；改成整份資料只讀一次要動到 `httpUtils` 和所有 service，另外處理

## 後續待辦

- 搜尋結果的「APPEND」按鈕在 `lineUtils.generateAddTrackPostbackButton` 裡會把 `position` 組成字串 `"null"`，`addTrackToPlaylist` 會把它當成有效值送給 Spotify，加到最後一首可能失敗（在 PR #5 處理）
