# LINE webhook 簽章改用原始 body 驗證

- 日期：2026-10-25
- Branch：`claude/webhook-raw-signature`
- PR：#<number>（開 PR 後補上）

## 背景

LINE 是對 webhook 請求的**原始 body** 計算 `x-line-signature`。目前程式是先讓 Fastify 把 body 解析成物件，再用 `JSON.stringify(request.body)` 重組成字串來驗證。只要原始 JSON 的寫法跟重組後不同，簽章就對不上，正常的訊息會被當成簽章錯誤、回 401 丟掉。

實測（每一種都用正確的方式對原始 body 簽章）：

- 會被誤擋：跳脫字元 `あ`、跳脫的斜線 `\/`、多餘的空白、結尾換行
- 不受影響：壓縮過的 JSON、直接寫在 body 裡的中文和 emoji

這是 PR #8 code review 時發現的既有問題，列在 `2026-10-25-fastify-5.md` 的後續待辦。

## 計畫

- [x] 只在 webhook 這個 route 範圍內，改用自訂的 JSON parser：保留原始字串，再自己 `JSON.parse`
- [x] 簽章改成對原始字串驗證，其他檢查（timing-safe 比對、缺 header）維持不變
- [x] 其他 route（例如 `POST /playlist/add`）的 JSON 解析不受影響
- [x] 驗證：上面 6 種寫法都要通過；竄改過的 body、缺簽章要回 401；不合法的 JSON 要回 400

## 實際改動

- `src/route/webhook.ts`：
  - 在 webhook 這個 route 範圍內，換掉 `application/json` 的 parser：先把原始字串存到 `request.rawBody`，再交給 Fastify 內建的 JSON parser（`getDefaultJsonParser`）解析。沿用內建 parser，保留原本的 `__proto__` / `constructor` 防護、空 body 和不合法 JSON 的錯誤處理
  - 簽章改成對 `request.rawBody` 計算；沒有原始字串時直接回 401
  - 用 TypeScript 的 module augmentation 在 `FastifyRequest` 加上 `rawBody` 型別
- 其他 route 不受影響：Fastify 的封裝範圍讓這個 parser 只套用在 `/webhook`

## 和計畫不同的地方

- 計畫寫「自己 `JSON.parse`」，實作時改用 Fastify 內建的 JSON parser：自己 `JSON.parse` 會拿掉內建的 `__proto__` 防護和空 body 檢查

## 驗證

- `npx tsc --noEmit` 通過
- 用 Fastify 實際送請求，每一種都用正確的方式對原始 body 簽章，同一支測試在修正前（main）和修正後各跑一次：

  | 情境 | 修正前 | 修正後 |
  |---|---|---|
  | 壓縮過的 JSON（LINE 驗證 webhook 用的空 events） | 200 | 200 |
  | 直接寫在 body 裡的中文和 emoji | 200 | 200 |
  | 跳脫字元 `\u3042` | **401** | 200 |
  | 跳脫的斜線 `\/` | **401** | 200 |
  | 多餘的空白 | **401** | 200 |
  | 結尾換行 | **401** | 200 |
  | body 被竄改 | 401 | 401 |
  | 沒有簽章 | 401 | 401 |
  | 不合法的 JSON | 400 | 400 |
  | 夾帶 `__proto__` | 400 | 400 |
  | 空 body | 400 | 400 |
  | 其他 route（`POST /playlist/add`）的 JSON 解析 | 正常 | 正常 |

- 用跳脫字元寫的 `login` 訊息：修正前回 401、使用者收不到回覆；修正後 bot 正常回覆登入連結
- 尚未在真的 LINE 上實測

## 影響與注意事項

- 不需要新的環境變數，也不需要重新登入
- 原本會被誤擋的訊息現在會正常處理；簽章檢查的嚴格程度沒有改變

## code review 中不處理的項目

（做完後補上）

## 後續待辦

（做完後補上）
