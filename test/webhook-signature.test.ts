import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import path from "path";
import crypto from "crypto";

const SECRET = "line-secret-for-test";
Object.assign(process.env, {
  BASE_URL: "https://bot.test",
  COOKIE_SECRET: "cookie-secret-for-test",
  LINE_CHANNEL_SECRET: SECRET,
  LINE_MESSAGING_API: "https://line.test",
});

// mongoDbUtils 會 import api/serverless（載入時就 listen），測試時換成替身
const mongoPath = require.resolve(path.join(__dirname, "../src/utils/mongoDbUtils.ts"));
const originalMongoModule = require.cache[mongoPath];
require.cache[mongoPath] = {
  id: mongoPath,
  filename: mongoPath,
  loaded: true,
  exports: { __esModule: true, default: { hasTokens: async () => false } },
} as any;

const lineReplies: any[] = [];
const originalFetch = globalThis.fetch;
(globalThis as any).fetch = async (url: string, init: any = {}) => {
  if (url.startsWith("https://line.test")) lineReplies.push(JSON.parse(init.body));
  return { ok: true, status: 200, json: async () => ({}), text: async () => "" };
};

const Fastify = require("fastify");
const webhook = require("../src/route/webhook").default;
const playlist = require("../src/route/spotify-playlist").default;

const sign = (raw: string | Buffer) =>
  crypto.createHmac("SHA256", SECRET).update(raw).digest("base64");
const textEvent = (text: string) =>
  `{"type":"message","replyToken":"rt","source":{"type":"user","userId":"U1"},"message":{"type":"text","id":"1","text":"${text}"}}`;

let app: any;
const post = (payload: string | Buffer, headers: Record<string, string> = {}) =>
  app.inject({
    method: "POST",
    url: "/webhook/",
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
    payload,
  });
const postSigned = (raw: string | Buffer) => post(raw, { "x-line-signature": sign(raw) });

before(async () => {
  app = Fastify({ logger: false });
  app.register(webhook, { prefix: "/webhook" });
  app.register(playlist, { prefix: "/playlist" });
  await app.ready();
});
after(async () => {
  await app.close();
  globalThis.fetch = originalFetch;
  if (originalMongoModule) require.cache[mongoPath] = originalMongoModule;
  else delete require.cache[mongoPath];
});

const accepted: [string, string][] = [
  ["壓縮過的 JSON（LINE 驗證 webhook 用的空 events）", `{"destination":"Uxx","events":[]}`],
  ["直接寫在 body 裡的中文和 emoji", `{"destination":"Uxx","events":[${textEvent("歌單 🎵")}]}`],
  ["跳脫字元 \\u3042", `{"destination":"Uxx","events":[${textEvent("\\u3042")}]}`],
  ["跳脫的斜線 \\/", `{"destination":"Uxx","events":[${textEvent("AC\\/DC")}]}`],
  ["多餘的空白", `{ "destination": "Uxx", "events": [] }`],
  ["結尾換行", `{"destination":"Uxx","events":[]}\n`],
];
for (const [name, raw] of accepted) {
  test(`簽章正確就接受：${name}`, async () => {
    assert.equal((await postSigned(raw)).statusCode, 200);
  });
}

test("簽章是對原始 bytes 計算：不合法的 UTF-8 也要驗得過", async () => {
  const raw = Buffer.concat([
    Buffer.from(`{"destination":"Uxx","events":[],"note":"`),
    Buffer.from([0xe6, 0xad]),
    Buffer.from(`"}`),
  ]);
  assert.equal((await postSigned(raw)).statusCode, 200);
});

test("簽章通過後會處理事件：用跳脫字元寫的 login 會收到登入連結", async () => {
  lineReplies.length = 0;
  const raw = `{"destination":"Uxx","events":[${textEvent("\\u006c\\u006f\\u0067\\u0069\\u006e")}]}`;
  assert.equal((await postSigned(raw)).statusCode, 200);
  assert.match(lineReplies[0].messages[0].text, /登入 Spotify/);
});

test("body 被竄改：401", async () => {
  const raw = `{"destination":"Uxx","events":[]}`;
  const res = await post(raw.replace("Uxx", "Uyy"), { "x-line-signature": sign(raw) });
  assert.equal(res.statusCode, 401);
});

test("沒有簽章：401", async () => {
  assert.equal((await post(`{"destination":"Uxx","events":[]}`)).statusCode, 401);
});

test("沒有簽章的壞 JSON：先驗簽章，回 401 而不是 400", async () => {
  assert.equal((await post("{bad")).statusCode, 401);
});

test("沒有 body：401", async () => {
  const res = await app.inject({ method: "POST", url: "/webhook/" });
  assert.equal(res.statusCode, 401);
});

test("簽章正確但 JSON 不合法：400", async () => {
  assert.equal((await postSigned("{bad")).statusCode, 400);
});

test("簽章正確但夾帶 __proto__：400（沿用 Fastify 內建的防護）", async () => {
  const raw = `{"destination":"Uxx","events":[],"__proto__":{"isAdmin":true}}`;
  assert.equal((await postSigned(raw)).statusCode, 400);
});

test("webhook 只接受 JSON：text/plain 回 415", async () => {
  const res = await app.inject({
    method: "POST",
    url: "/webhook/",
    headers: { "content-type": "text/plain", "x-line-signature": sign("x") },
    payload: "x",
  });
  assert.equal(res.statusCode, 415);
});

test("兩種 401（簽章錯誤、沒有 body）的回應格式一樣", async () => {
  const mismatch = await post(`{"destination":"Uxx","events":[]}`, { "x-line-signature": "AAAA" });
  const noBody = await app.inject({ method: "POST", url: "/webhook/" });
  assert.equal(mismatch.statusCode, 401);
  assert.equal(noBody.statusCode, 401);
  assert.deepEqual(mismatch.json(), noBody.json());
  assert.equal(mismatch.json().statusCode, 401);
});

test("沒設定 LINE_CHANNEL_SECRET：回 500，process 不會掛掉", async () => {
  const saved = process.env.LINE_CHANNEL_SECRET;
  delete process.env.LINE_CHANNEL_SECRET;
  try {
    const res = await post(`{"destination":"Uxx","events":[]}`, { "x-line-signature": "AAAA" });
    assert.equal(res.statusCode, 500);
  } finally {
    process.env.LINE_CHANNEL_SECRET = saved;
  }
  assert.equal((await postSigned(`{"destination":"Uxx","events":[]}`)).statusCode, 200);
});

test("GET /webhook 照常運作", async () => {
  const res = await app.inject({ method: "GET", url: "/webhook/" });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body, "Webhook GET route is active");
});

test("其他 route 的 JSON 解析不受影響", async () => {
  const res = await app.inject({
    method: "POST",
    url: "/playlist/add",
    payload: { uri: "spotify:track:1", position: -1, lineUserId: "U1" },
  });
  assert.equal(res.statusCode, 400);
  assert.match(res.body, /position/);
});
