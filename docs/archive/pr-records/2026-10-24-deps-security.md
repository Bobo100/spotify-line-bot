# 更新相依套件修補安全性漏洞

- 日期：2026-10-24
- Branch：`chore/deps-security-2026-10`
- PR：#6

## 背景

GitHub Dependabot 對這個 repo 開了 141 個 alert，幾乎都是 `yarn.lock` 裡的間接相依（axios、undici、tar、brace-expansion、minimatch、js-yaml、fast-uri、follow-redirects、qs、lodash 等），另外有直接相依 `fastify`。`yarn.lock` 很久沒更新，很多套件停在 `package.json` 範圍允許的舊版本。

這是正式上線中的服務，所以這次只做不跨 major 的更新，不改程式碼。

## 計畫

- [x] `yarn upgrade`：照 `package.json` 現有範圍，把所有套件更新到範圍內最新版（不改範圍）
- [x] 更新後還沒修好、而且修正版跟上層套件要求的版本同一個 major 的，用 `resolutions` 處理
- [x] 需要直接相依跨 major 才能修的，不在這次處理，列在「後續待辦」
- [x] 驗證：`yarn install --frozen-lockfile`、`npx tsc --noEmit`，更新前後各跑一次

## 實際改動

- `yarn.lock`：`yarn upgrade` 重新產生，直接相依更新如下（`package.json` 的範圍沒改）
  - `fastify` 4.25.1 → 4.29.1、`@fastify/cookie` 9.2.0 → 9.4.0、`@line/bot-sdk` 8.0.2 → 8.4.1、`@vercel/node` 3.0.13 → 3.2.29
  - `dotenv` 16.3.1 → 16.6.1、`nodemon` 3.0.2 → 3.1.14、`typescript` 5.3.3 → 5.9.3、`@types/node` 24.12.4 → 24.19.2、`@types/lodash` 4.14.202 → 4.17.27
  - `@fastify/mongodb` 8.0.0、`fastify-cli` 5.9.0、`fastify-plugin` 4.5.1、`ts-node` 10.9.2、`tap` 16.3.10 已經是範圍內最新，沒變
  - 會在執行期用到、變動比較大的間接相依：`mongodb` driver 6.3.0 → 6.21.0（`@fastify/mongodb` 帶進來）、`axios` 1.6.2 → 1.20.0（`@line/bot-sdk` 呼叫 LINE API 用）、`lodash` 4.17.21 → 4.18.1、`ajv` 8.12.0 → 8.20.0（fastify 的 schema 編譯用）
- `package.json`：新增 `resolutions`，三個都是 `@vercel/node` 3.x 底下寫死版本的套件，修正版都在同一個 major
  - `@vercel/node/undici`: 5.29.0（main 是 5.26.5；只跑 `yarn upgrade` 會被 `@vercel/node` 3.2.29 寫死在 5.28.4，修 alert #19、#23）
  - `@vercel/node/path-to-regexp`: 6.2.1 → 6.3.0（修 #13）
  - `**/@vercel/static-config/ajv`: 8.6.3 → 8.20.0（修 #51；`@vercel/static-config` 不是根目錄的直接相依，所以要加 `**/`）
- 結果：141 個 alert 中 93 個的有漏洞版本已經不在 `yarn.lock` 裡（`yarn upgrade` 修 89 個，`resolutions` 修 4 個），剩 48 個。Dependabot 要等 merge 到 `main` 後重新掃描才會關閉

## 和計畫不同的地方

- `yarn build` 會因為 `engines` 要求 Node 24 而拒絕執行（本機是 Node 22），而且 `tsconfig.json` 沒設 `outDir`，執行 `tsc` 會在原始碼旁邊產生 `.js` 檔。所以改用 `CLAUDE.md` 寫的 `npx tsc --noEmit` 做型別檢查，安裝時加 `--ignore-engines`
- `ajv` 的 resolution 一開始寫成 `@vercel/static-config/ajv` 沒有生效（`yarn.lock` 還留著 8.6.3），改成 `**/@vercel/static-config/ajv` 後才生效
- code review 後：補上會在執行期用到的間接相依變動（`mongodb`、`axios` 等），修正「只有程式碼 import 的套件會部署」的錯誤說法，並補上 `lodash` 沒有宣告在 `package.json` 的問題

## 驗證

| 檢查 | 更新前（main） | 更新後 |
|---|---|---|
| `yarn install --frozen-lockfile --ignore-engines` | 通過 | 通過（三個 `resolutions` 會顯示預期中的「incompatible with requested version」警告） |
| `npx tsc --noEmit -p tsconfig.json` | 0 個錯誤 | 0 個錯誤 |
| 測試 | 沒有測試檔，`tap` 沒有東西可跑 | 同左 |

- alert 是否修好：用每個 alert 的有漏洞版本範圍比對更新前後 `yarn.lock` 裡實際解析出的版本（semver）
- 沒有用 `require('./api/serverless')` 做 smoke test：這個檔案在載入時就會呼叫 `app.listen()` 並連線 MongoDB，需要環境變數和網路
- PR 的 Vercel preview 部署成功；尚未在真的 LINE / Spotify 上實測
- code review + 對抗性驗證：重新計算的 alert 數字、各組數量、版本號都一致；10 項意見中 7 項已修，3 項說明不處理的原因

## 影響與注意事項

- 不需要新的環境變數，也不需要重新登入
- 程式碼直接 import 的套件是 `fastify`、`@fastify/cookie`、`@fastify/mongodb`、`@line/bot-sdk`、`dotenv`、`lodash`，執行期還會用到它們的間接相依（例如 `mongodb`、`axios`、`find-my-way`、`file-type`）。`@vercel/node`、`fastify-cli`、`nodemon`、`ts-node`、`typescript`、`tap` 沒有被程式碼 import；推測不會進 function bundle，但沒有實際檢查 bundle 內容
- 全部都是同一個 major 內的更新；merge 後如果 LINE 上的行為有異常，先查 `mongodb` driver（6.3 → 6.21）和 `axios`（1.6 → 1.20），再查 `fastify`（4.25 → 4.29）和 `@line/bot-sdk`（8.0 → 8.4）
- `lodash` 沒有宣告在 `package.json`，目前是 `tap`（devDependency）→ `ink` → `lodash` 被 hoist 到根目錄才找得到。這次只是跟著 `tap` 的相依樹從 4.17.21 變成 4.18.1，行為和 main 一樣

## code review 中不處理的項目

- 「branch 名稱應該是 `claude/<topic>`」：屬實。branch 名稱是開工時的指示指定的，改名要關掉這個 PR 重開，不處理
- 「安全性修正依 `CLAUDE.md` 應該用 `fix`」：`CLAUDE.md` 也寫相依套件用 `build`。這次沒有改任何程式碼行為，只更新相依套件，所以用 `build`，安全性的原因寫在內文
- 「`@vercel/node` 不會進 function bundle 是推測」：屬實，已在「影響與注意事項」標明是推測；要移掉 `@vercel/node` 時再實際確認

## 後續待辦

剩下的 48 個 alert 都需要跨 major 更新，或目前沒有修正版：

- `fastify` 4 → 5（16 個，執行期會用到）：`fastify` 15 個、`find-my-way` 1 個。`@fastify/cookie`、`@fastify/mongodb` 也要一起升 major
- `@line/bot-sdk` 8 → 11（1 個，執行期會用到）：`file-type`（新版已經沒有這個相依）
- `@vercel/node` 3.x 底下（28 個，程式碼沒有 import）：
  - 升到最新的 `@vercel/node`（3 → 27）可以修 `tar` 12 個、`esbuild` 1 個；但最新版仍寫死 undici 5.28.4、path-to-regexp 6.1.0、ajv 8.6.3，這次的 `resolutions` 要保留
  - `undici` 13 個、`@fastify/busboy` 2 個要 undici 6，連最新版的 `@vercel/node` 都修不了
  - 程式碼沒有用到 `@vercel/node`，可以評估直接從 `dependencies` 移掉，這 28 個會一起消失（要另開 PR，確認 `vercel.json` 的 `builds` 不依賴專案裡的這個套件，並確認 preview 部署正常）
- `tap`（1 個，只在開發用）：`uuid`
- 目前沒有修正版（2 個）：`braces`（來自 `tap` 和 `@vercel/nft`）、`sprintf-js`（來自 `tap`）
- `lodash` 要宣告在 `dependencies`：程式碼執行期用到 `lodash/get`、`lodash/isEqual`，但目前靠 `tap` 的相依被 hoist 才找得到，移掉 `tap` 就會壞
- `fastify-cli`、`nodemon`、`ts-node`、`typescript`、`@types/node`、`@types/lodash` 放在 `dependencies`，應該移到 `devDependencies`；`fastify-plugin` 沒有被 import，可以移掉
