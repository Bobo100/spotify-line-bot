# LINE webhook 簽章改用原始 body 驗證

- 日期：2026-10-25
- Branch：`claude/webhook-raw-signature`
- PR：#9

## 背景

LINE 是對 webhook 請求的**原始 body** 計算 `x-line-signature`。目前程式是先讓 Fastify 把 body 解析成物件，再用 `JSON.stringify(request.body)` 重組成字串來驗證。只要原始 JSON 的寫法跟重組後不同，簽章就對不上，正常的訊息會被當成簽章錯誤、回 401 丟掉。

實測（每一種都用正確的方式對原始 body 簽章）：

- 會被誤擋：跳脫字元 `\u3042`、跳脫的斜線 `\/`、多餘的空白、結尾換行
- 不受影響：壓縮過的 JSON、直接寫在 body 裡的中文和 emoji

這是 PR #8 code review 時發現的既有問題，列在 `2026-10-25-fastify-5.md` 的後續待辦。

## 計畫

- [x] 只在 webhook 這個 route 範圍內，改用自訂的 JSON parser：保留原始字串，再自己 `JSON.parse`
- [x] 簽章改成對原始字串驗證，其他檢查（timing-safe 比對、缺 header）維持不變
- [x] 其他 route（例如 `POST /playlist/add`）的 JSON 解析不受影響
- [x] 驗證：上面 6 種寫法都要通過；竄改過的 body、缺簽章要回 401；不合法的 JSON 要回 400

## 實際改動

- `src/route/webhook.ts`：
  - 在 webhook 這個 route 範圍內，換掉 `application/json` 的 parser，用原始 bytes（`parseAs: "buffer"`）**先驗簽章、再解析 JSON**：
    - 用 `@line/bot-sdk` 的 `validateSignature`（HMAC-SHA256 + timing-safe 比對），取代原本自己寫的同一段邏輯
    - 簽章不符：記 log，回 401，不解析 JSON
    - 簽章正確：交給 Fastify 內建的 JSON parser（`getDefaultJsonParser`，`__proto__` / `constructor` 防護的設定跟 app 一致）
  - handler 檢查這個 request 有沒有經過驗簽，沒有就記 log、回 401。沒有 body 或 `text/plain` 這類請求不會經過上面的 parser，靠這道檢查擋下
  - 「已驗過簽章」用 `WeakSet` 記錄，不改 `FastifyRequest` 的全域型別
- 其他 route 不受影響：Fastify 的封裝範圍讓這個 parser 只套用在 `/webhook`
- `test/webhook-signature.test.ts`：新增 16 項測試（Node 內建的 `node:test`，不用新套件）
- `package.json`：新增 `test` script
- `CLAUDE.md`：常用指令加上 `npm test`

## 和計畫不同的地方

- 計畫寫「保留原始字串，再自己 `JSON.parse`」。實作時改用 Fastify 內建的 JSON parser，避免拿掉內建的 `__proto__` 防護和空 body 檢查
- code review 後：
  - 對原始 bytes（不是解碼後的字串）計算簽章：body 有不合法的 UTF-8 時，解碼會換成替代字元，簽章就對不上
  - 改成先驗簽章再解析：原本沒簽章的壞 JSON 會先被解析、回 400，現在一律回 401，也不會替沒驗證過的請求花時間解析
  - 改用 `@line/bot-sdk` 的 `validateSignature`
  - `__proto__` 防護的設定改成讀 app 的設定，不寫死
  - 「已驗過簽章」的標記只留在 webhook 裡，不加到全 app 的型別上
  - 兩條 401 路徑都會記 log
  - 驗證腳本改成正式測試，放進 repo

## 驗證

- `npx tsc --noEmit` 通過（包含測試檔）
- `npm test`：16 項全部通過。同一份測試在修正前的 main 上跑，有 7 項失敗，可以擋住改回舊寫法的情況：

  | 情境 | 修正前 | 修正後 |
  |---|---|---|
  | 壓縮過的 JSON（LINE 驗證 webhook 用的空 events） | 200 | 200 |
  | 直接寫在 body 裡的中文和 emoji | 200 | 200 |
  | 跳脫字元 `\u3042` | **401** | 200 |
  | 跳脫的斜線 `\/` | **401** | 200 |
  | 多餘的空白 | **401** | 200 |
  | 結尾換行 | **401** | 200 |
  | 不合法的 UTF-8（簽章對原始 bytes 計算） | **401** | 200 |
  | 用跳脫字元寫的 `login`：會收到登入連結 | **401，收不到回覆** | 200，有回覆 |
  | body 被竄改 | 401 | 401 |
  | 沒有簽章 | 401 | 401 |
  | 沒有簽章的壞 JSON | **400** | 401 |
  | 沒有 body | 401 | 401 |
  | 簽章正確但 JSON 不合法 | 400 | 400 |
  | 簽章正確但夾帶 `__proto__` | 400 | 400 |
  | `text/plain`（不經過驗簽的 parser） | 401 | 401 |
  | 其他 route（`POST /playlist/add`）的 JSON 解析 | 正常 | 正常 |

- 尚未在真的 LINE 上實測

## 影響與注意事項

- 不需要新的環境變數，也不需要重新登入
- 原本會被誤擋的訊息現在會正常處理；簽章檢查的嚴格程度沒有降低
- 沒有簽章、而且 JSON 不合法的請求，回應從 400 改成 401
- 簽章錯誤時的 log 從 `console.log("Signature mismatch")` 改成 Fastify logger 的 `LINE signature mismatch`（warn）

## code review 中不處理的項目

無

## 後續待辦

- `api/serverless.ts` 不要在載入時就 `listen`（`2026-10-25-fastify-5.md` 列的既有問題）
- 整理相依套件：`tap` 沒有被任何測試使用（這次的測試用 `node:test`），可以移除；移除前要先把 `lodash` 加進 `dependencies`，並把開發工具移到 `devDependencies`
