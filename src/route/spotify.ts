import {
  FastifyInstance,
  FastifyServerOptions,
  FastifyRequest,
  FastifyReply,
} from "fastify";
import crypto from "crypto";
import httpUtils from "../utils/httpUtils";
import mongoDbUtils from "../utils/mongoDbUtils";
import { fetchAndStoreProfile } from "../services/spotify/user";
import { verifyLoginToken } from "../services/spotify/loginToken";
import { authLink, routeLink } from "../utils/routeLink";

type LoginRequest = FastifyRequest<{
  Querystring: { t?: string };
}>;

type CallbackRequest = FastifyRequest<{
  Querystring: { code?: string; state?: string };
}>;

const VERIFIER_COOKIE = "spotify_pkce_verifier";
const STATE_COOKIE = "spotify_oauth_state";
const LINE_USER_COOKIE = "spotify_line_user";
const COOKIE_OPTS = {
  signed: true,
  httpOnly: true,
  sameSite: "lax" as const,
  secure: true,
  path: "/",
  maxAge: 10 * 60,
};

const callbackLink = `${process.env.BASE_URL}${routeLink.spotify}${authLink.callback}`;

const spotify = (
  fastify: FastifyInstance,
  opts: FastifyServerOptions,
  done: any
) => {
  fastify.get(authLink.default, async (_request, _reply) => {
    return `${process.env.ENV} Spotify API`;
  });

  fastify.get(
    authLink.login,
    async (request: LoginRequest, reply: FastifyReply) => {
      const loginToken = request.query.t;
      if (!loginToken) {
        return reply.code(400).send("Missing login token. 請從 LINE Bot 輸入 login 取得連結。");
      }
      const lineUserId = verifyLoginToken(loginToken);
      if (!lineUserId) {
        return reply.code(400).send("Invalid or expired login token");
      }

      const clientId = process.env.SPOTIFY_CLIENT_ID;
      const codeVerifier = generateCodeVerifier(128);
      const codeChallenge = await createCodeChallenge(codeVerifier);
      const state = crypto.randomBytes(32).toString("hex");

      const params = new URLSearchParams();
      params.append("client_id", clientId!);
      params.append("response_type", "code");
      params.append("redirect_uri", `${callbackLink}`);
      params.append(
        "scope",
        "user-read-private user-read-playback-state user-modify-playback-state playlist-read-private playlist-modify playlist-modify-private"
      );
      params.append("code_challenge_method", "S256");
      params.append("code_challenge", codeChallenge);
      params.append("state", state);

      reply
        .setCookie(VERIFIER_COOKIE, codeVerifier, COOKIE_OPTS)
        .setCookie(STATE_COOKIE, state, COOKIE_OPTS)
        .setCookie(LINE_USER_COOKIE, lineUserId, COOKIE_OPTS)
        .redirect(`https://accounts.spotify.com/authorize?${params.toString()}`);
    }
  );

  fastify.get(
    authLink.callback,
    async (request: CallbackRequest, reply: FastifyReply) => {
      const code = request.query.code;
      const state = request.query.state;
      if (!code) {
        return reply.redirect(process.env.BASE_URL as string);
      }

      const verifierCookie = request.cookies[VERIFIER_COOKIE];
      const stateCookie = request.cookies[STATE_COOKIE];
      const lineUserCookie = request.cookies[LINE_USER_COOKIE];
      const verifierUnsigned = verifierCookie
        ? request.unsignCookie(verifierCookie)
        : null;
      const stateUnsigned = stateCookie
        ? request.unsignCookie(stateCookie)
        : null;
      const lineUserUnsigned = lineUserCookie
        ? request.unsignCookie(lineUserCookie)
        : null;

      reply.clearCookie(VERIFIER_COOKIE, { path: "/" });
      reply.clearCookie(STATE_COOKIE, { path: "/" });
      reply.clearCookie(LINE_USER_COOKIE, { path: "/" });

      if (
        !verifierUnsigned?.valid ||
        !stateUnsigned?.valid ||
        !lineUserUnsigned?.valid ||
        !state ||
        stateUnsigned.value !== state
      ) {
        return reply.code(400).send("Invalid OAuth state");
      }

      const lineUserId = lineUserUnsigned.value!;

      try {
        const clientId = process.env.SPOTIFY_CLIENT_ID;
        const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
        const params = new URLSearchParams();
        params.append("client_id", clientId!);
        params.append("client_secret", clientSecret!);
        params.append("grant_type", "authorization_code");
        params.append("code", code);
        params.append("redirect_uri", `${callbackLink}`);
        params.append("code_verifier", verifierUnsigned.value!);
        const result = await httpUtils.httpFetchPost({
          url: "https://accounts.spotify.com/api/token",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: params,
        });
        const { access_token, refresh_token } = result;
        if (access_token && refresh_token) {
          await mongoDbUtils.updateTokens(lineUserId, {
            access_token,
            refresh_token,
          });
          await fetchAndStoreProfile(lineUserId);
          return `Success! 你可以回到 LINE 繼續使用。`;
        }
        return `Failed!`;
      } catch (error) {
        request.log.error(error, "OAuth callback failed");
        return reply.code(500).send("Internal error");
      }
    }
  );
  done();
};

function generateCodeVerifier(length: number) {
  const validChars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  let array = new Uint8Array(length);
  crypto.randomFillSync(array);
  array = array.map((x) => validChars.charCodeAt(x % validChars.length));
  return String.fromCharCode.apply(null, array as any);
}

async function createCodeChallenge(codeVerifier: string) {
  return crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

export default spotify;
