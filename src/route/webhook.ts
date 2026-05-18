import {
  FastifyInstance,
  FastifyServerOptions,
  FastifyRequest,
  FastifyReply,
} from "fastify";
import crypto from "crypto";
import { WebhookRequestBody, MessageEvent, PostbackEvent } from "@line/bot-sdk";
import _get from "lodash/get";
import processUtils from "../utils/processUtils";
import lineUtils from "../utils/lineUtils";
import {
  filterSearchType,
  actionCommands,
  footerActionType,
} from "../utils/lineType";
import { routeLink } from "../utils/routeLink";
import { searchTracks, fetchSpotifyUrl } from "../services/spotify/search";
import { addTrackToPlaylist } from "../services/spotify/playlist";

type WebhookRequest = FastifyRequest<{
  Body: WebhookRequestBody;
}>;

const webhook = (
  fastify: FastifyInstance,
  opts: FastifyServerOptions,
  done: any
) => {
  fastify.post(
    routeLink.default,
    async (request: WebhookRequest, reply: FastifyReply) => {
      const r = JSON.stringify(request.body);
      const expected = crypto
        .createHmac("SHA256", process.env.LINE_CHANNEL_SECRET!)
        .update(r || "")
        .digest();
      const received = request.headers["x-line-signature"];
      const receivedBuf =
        typeof received === "string" ? Buffer.from(received, "base64") : null;
      if (
        !receivedBuf ||
        receivedBuf.length !== expected.length ||
        !crypto.timingSafeEqual(expected, receivedBuf)
      ) {
        console.log("Signature mismatch");
        return reply.status(401).send("Unauthorized");
      }

      const events = request.body.events;
      await Promise.all(
        events.map(async (event) => {
          switch (event.type) {
            case "message":
              return await handleMessageEvent(event);
            case "postback":
              return await handlePostbackEvent(event);
            default:
              return;
          }
        })
      );

      return reply.status(200).send();
    }
  );

  fastify.get(routeLink.default, async (_request, reply) => {
    return reply.status(200).send("Webhook GET route is active");
  });

  done();
};

const handleMessageEvent = async (body: MessageEvent) => {
  if (body.message.type !== "text") return;
  return await handleTextEventMessage(body.message.text, body.replyToken);
};

const handlePostbackEvent = async (postbackEvent: PostbackEvent) => {
  const { data } = postbackEvent.postback;
  const replyToken = postbackEvent.replyToken;

  const searchParams = new URLSearchParams(data);
  const { action, uri, position, next, type, market, limit, offset } =
    Object.fromEntries(searchParams.entries());
  switch (action) {
    case actionCommands.ADD_TRACK: {
      const result = await addTrackToPlaylist(uri, position);
      return await lineUtils.replayMessage(replyToken, {
        type: "text",
        text: result.ok ? "已加入歌單" : `加入失敗: ${result.error ?? ""}`,
      });
    }
    case actionCommands.NEXT_PAGE:
    case actionCommands.PERVIOUS_PAGE: {
      const decodedNext = decodeURIComponent(next);
      const spotifyResponse = await fetchSpotifyUrl(
        next + `&type=${type}&market=${market}&limit=${limit}&offset=${offset}`
      );
      const errorStatus = _get(spotifyResponse, "error.status");
      if (errorStatus) {
        return await lineUtils.replayMessage(replyToken, {
          type: "text",
          text: `postback${searchParams} 連結${decodedNext} 錯誤內容${JSON.stringify(
            spotifyResponse
          )}`,
        });
      }
      return await replyWithSearchResult(replyToken, spotifyResponse);
    }
    default:
      return;
  }
};

const handleTextEventMessage = async (text: string, replyToken: string) => {
  try {
    const searchData = await searchTracks(text);
    if (_get(searchData, "error.status")) return null;
    return await replyWithSearchResult(replyToken, searchData);
  } catch (error) {
    console.log(error);
    return null;
  }
};

const replyWithSearchResult = async (replyToken: string, searchData: any) => {
  const { result, prevUrl, nextUrl, limit, offset } =
    processUtils.filterSearch(searchData);
  const message = lineUtils.generateMessageTemplate();
  message.contents.body.contents = result.map((item: filterSearchType) =>
    lineUtils.generateFlexbox(item)
  );
  const footerData = { prevUrl, nextUrl, limit, offset } as footerActionType;
  message.contents.footer.contents = [
    lineUtils.generateFooter(footerData),
  ] as never[];
  await lineUtils.replayMessage(replyToken, message);
  return message;
};

export default webhook;
