import crypto from "crypto";

const TTL_MS = 10 * 60 * 1000;

const secret = (): string => {
  const s = process.env.COOKIE_SECRET;
  if (!s) throw new Error("COOKIE_SECRET not configured");
  return s;
};

const sign = (payload: string): string =>
  crypto.createHmac("sha256", secret()).update(payload).digest("base64url");

export const createLoginToken = (lineUserId: string): string => {
  const exp = Date.now() + TTL_MS;
  const payload = `${lineUserId}.${exp}`;
  const encoded = Buffer.from(payload).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
};

export const verifyLoginToken = (token: string): string | null => {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  const expectedSig = sign(encoded);
  const sigBuf = Buffer.from(sig, "base64url");
  const expBuf = Buffer.from(expectedSig, "base64url");
  if (
    sigBuf.length !== expBuf.length ||
    !crypto.timingSafeEqual(sigBuf, expBuf)
  ) {
    return null;
  }
  const payload = Buffer.from(encoded, "base64url").toString();
  const [lineUserId, expStr] = payload.split(".");
  const exp = Number(expStr);
  if (!exp || Date.now() > exp) return null;
  return lineUserId || null;
};
