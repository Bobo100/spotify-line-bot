# 程式碼健檢：bug、安全性、多用戶 schema

- 日期：2026-10-22（補記）
- Branch：`claude/explore-project-overview-Avo3i`
- PR：#1

## 背景

檢查整個專案時發現幾個會出 bug 的地方（token 過期就壞、Vercel 上登入流程不穩），還有一些安全性與架構問題。

## 實際改動（依 commit 順序）

1. **fix**：`httpUtils` 遇到 401 重試後沒有 `return`，呼叫端拿到 `undefined`
2. **fix**：webhook 只處理 `events[0]`，改成處理所有 events
3. **security**：webhook 簽章比對改用 `crypto.timingSafeEqual`
4. **fix**：`/playlist/add` 從 GET 改成 POST + JSON body
5. **security**：`/spotify/refresh` 加上 secret header（後來在第 9 項整個移除）
6. **refactor**：`playlist_id` 改從 MongoDB 讀，不再寫死
7. **security**：OAuth 的 `code_verifier` 改存簽章 cookie，並加上 `state` 防 CSRF
8. **chore**：`fastify`、`dotenv` 移到 dependencies；cookie secret 改讀 `COOKIE_SECRET`
9. **refactor**：新增 `src/services/spotify/`，webhook 直接呼叫 function，不再自己打自己的 HTTP；移除 `/spotify/refresh` route
10. **feat**：MongoDB 改成單一 `users` collection，用 LINE userId 當 key；新增 LINE `login` 指令產生個人化登入連結
11. **chore**：`engines.node` 鎖 24.x，`@types/node` 升到 24

## 影響與注意事項

- **Breaking**：舊的 `token` / `user` / `playlist` collection 不再使用，使用者要在 LINE 輸入 `login` 重新登入
- 對外 routes（`/search`、`/playlist/*`、`/user/profile`）都要帶 `lineUserId`
- 新環境變數：`COOKIE_SECRET`
- Vercel Project Settings 的 Node.js Version 要設成 24.x

## 已知缺口

- 還沒有設定 `playlistId` 的入口，`addTrackToPlaylist` 在 MongoDB 沒有資料時會回「playlist_id 尚未設定」
