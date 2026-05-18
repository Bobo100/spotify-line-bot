import {
  FastifyInstance,
  FastifyServerOptions,
  FastifyRequest,
  FastifyReply,
} from "fastify";
import crypto from "crypto";
import { setCodeVerifer } from "../utils/auth";
import _get from "lodash/get";
import httpUtils from "../utils/httpUtils";
import mongoDbUtils from "../utils/mongoDbUtils";
import { getCodeVerifer } from "../utils/auth";
import { authLink, routeLink, userLink } from "../utils/routeLink";

type MyRequest = FastifyRequest<{
  Querystring: {
    code: string;
  };
}>;

const callbackLink = `${process.env.BASE_URL}${routeLink.spotify}${authLink.callback}`;

const spotify = (
  fastify: FastifyInstance,
  opts: FastifyServerOptions,
  done: any
) => {
  fastify.get(authLink.default, async (request, reply) => {
    return `${process.env.ENV} Spotify API`;
  });

  fastify.get(authLink.login, async (request, reply) => {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const params = new URLSearchParams();
    params.append("client_id", clientId!);
    params.append("response_type", "code");
    params.append("redirect_uri", `${callbackLink}`);
    params.append(
      "scope",
      "user-read-private user-read-playback-state user-modify-playback-state playlist-read-private playlist-modify playlist-modify-private"
    );
    params.append("code_challenge_method", "S256");
    const codeVerifier = generateCodeVerifier(128);
    setCodeVerifer(codeVerifier);
    const codeChallenge = await createCodeChallenge(codeVerifier);
    params.append("code_challenge", codeChallenge);
    reply.redirect(
      `https://accounts.spotify.com/authorize?${params.toString()}`
    );
  });

  // refreshAccessToken
  fastify.get(authLink.refresh, async (request, reply) => {
    const provided = request.headers["x-internal-secret"];
    const expected = process.env.INTERNAL_SECRET;
    if (!expected || provided !== expected) {
      return reply.code(401).send("Unauthorized");
    }
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const { refresh_token } = await mongoDbUtils.getTokens();
    const Params = new URLSearchParams();
    Params.append("client_id", clientId!);
    Params.append("grant_type", "refresh_token");
    Params.append("refresh_token", refresh_token);
    const spotifyResponse = await httpUtils.httpFetchPost({
      url: "https://accounts.spotify.com/api/token",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: Params,
    });
    const new_access_token = _get(spotifyResponse, "access_token");
    const new_refresh_token = _get(spotifyResponse, "refresh_token");
    if (new_access_token && new_refresh_token) {
      await mongoDbUtils.updateTokens({
        access_token: new_access_token,
        refresh_token: new_refresh_token,
      });
      return reply.code(200).send(spotifyResponse);
    } else {
      return reply.code(500).send(spotifyResponse);
    }
  });

  fastify.get(
    authLink.callback,
    async (request: MyRequest, reply: FastifyReply) => {
      const code = request.query.code;
      if (code) {
        try {
          const clientId = process.env.SPOTIFY_CLIENT_ID;
          const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
          const params = new URLSearchParams();
          params.append("client_id", clientId!);
          params.append("client_secret", clientSecret!);
          params.append("grant_type", "authorization_code");
          params.append("code", code);
          params.append("redirect_uri", `${callbackLink}`);
          const codeVerifier = getCodeVerifer();
          params.append("code_verifier", codeVerifier!);
          const result = await httpUtils.httpFetchPost({
            url: "https://accounts.spotify.com/api/token",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: params,
          });
          const { access_token, refresh_token } = result;
          if (access_token && refresh_token) {
            await mongoDbUtils.updateTokens({
              access_token: access_token,
              refresh_token: refresh_token,
            });
            await httpUtils.httpFetchGet({
              url: process.env.BASE_URL + userLink.profile,
            });
            return `Success!`;
          } else {
            return `Failed!`;
          }
        } catch (error) {}
      } else {
        reply.redirect(process.env.BASE_URL as string);
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
