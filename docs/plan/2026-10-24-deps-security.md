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
- `package.json`：新增 `resolutions`，三個都是 `@vercel/node` 3.x 底下寫死版本的套件，修正版都在同一個 major
  - `@vercel/node/undici`: 5.28.4 → 5.29.0（修 alert #19、#23）
  - `@vercel/node/path-to-regexp`: 6.2.1 → 6.3.0（修 #13）
  - `**/@vercel/static-config/ajv`: 8.6.3 → 8.20.0（修 #51；`@vercel/static-config` 不是根目錄的直接相依，所以要加 `**/`）
- 結果：141 個 alert 中 93 個的有漏洞版本已經不在 `yarn.lock` 裡（`yarn upgrade` 修 89 個，`resolutions` 修 4 個），剩 48 個

## 和計畫不同的地方

- `yarn build` 會因為 `engines` 要求 Node 24 而拒絕執行（本機是 Node 22），而且 `tsconfig.json` 沒設 `outDir`，執行 `tsc` 會在原始碼旁邊產生 `.js` 檔。所以改用 `CLAUDE.md` 寫的 `npx tsc --noEmit` 做型別檢查，安裝時加 `--ignore-engines`

## 驗證

| 檢查 | 更新前（main） | 更新後 |
|---|---|---|
| `yarn install --frozen-lockfile --ignore-engines` | 通過 | 通過（三個 `resolutions` 會顯示預期中的「incompatible with requested version」警告） |
| `npx tsc --noEmit -p tsconfig.json` | 0 個錯誤 | 0 個錯誤 |
| 測試 | 沒有測試檔，`tap` 沒有東西可跑 | 同左 |

- alert 是否修好：用每個 alert 的有漏洞版本範圍比對更新前後 `yarn.lock` 裡實際解析出的版本（semver）
- 沒有用 `require('./api/serverless')` 做 smoke test：這個檔案在載入時就會呼叫 `app.listen()` 並連線 MongoDB，需要環境變數和網路
- 等 PR 的 Vercel preview 部署成功；尚未在真的 LINE / Spotify 上實測

## 影響與注意事項

- 不需要新的環境變數，也不需要重新登入
- 實際部署到 Vercel function 的只有程式碼 import 的套件：`fastify`、`@fastify/cookie`、`@fastify/mongodb`、`@line/bot-sdk`、`dotenv`、`lodash`。`@vercel/node`、`fastify-cli`、`nodemon`、`ts-node`、`typescript`、`tap` 都沒有被程式碼 import
- `fastify` 4.25 → 4.29、`@line/bot-sdk` 8.0 → 8.4 是同一個 major 內的更新；merge 後如果 LINE 上的行為有異常，先從這兩個查

## code review 中不處理的項目

無

## 後續待辦

剩下的 48 個 alert 都需要跨 major 更新，或目前沒有修正版：

- `fastify` 4 → 5（16 個，會部署到 function）：`fastify` 15 個、`find-my-way` 1 個。`@fastify/cookie`、`@fastify/mongodb`、`fastify-plugin` 也要一起升 major
- `@line/bot-sdk` 8 → 11（1 個，會部署到 function）：`file-type`（新版已經沒有這個相依）
- `@vercel/node` 3.x 底下（28 個，build 工具，程式碼沒有 import）：
  - 升 `@vercel/node` major 可以修 `tar` 12 個、`esbuild` 1 個
  - `undici` 13 個、`@fastify/busboy` 2 個要 undici 6，但連最新版的 `@vercel/node` 都還是寫死 undici 5.28.4，升級也修不了
  - 程式碼沒有用到 `@vercel/node`，`vercel.json` 的 `builds` 用的是 Vercel 自己的 builder；可以評估直接從 `dependencies` 移掉，這 28 個會一起消失（要另開 PR，並確認 preview 部署正常）
- `tap`（1 個，只在開發用）：`uuid`
- 目前沒有修正版（2 個）：`braces`（來自 `tap` 和 `@vercel/nft`）、`sprintf-js`（來自 `tap`）
- `fastify-cli`、`nodemon`、`ts-node`、`typescript` 放在 `dependencies`，應該移到 `devDependencies`
