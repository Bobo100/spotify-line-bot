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
import _isEqual from "lodash/isEqual";
import {
  routeLink,
  searchLink,
  userLink,
  playlistLink,
} from "../utils/routeLink";
import httpUtils from "../utils/httpUtils";

type WebhookRequest = FastifyRequest<{
  Body: WebhookRequestBody;
}>;

// 1. 用戶向 LineBot 發送訊息。
// 2. LineBot 將此訊息發送到您的 Vercel 伺服器上的 Webhook URL。
// 3. 您的 Vercel 伺服器接收訊息，並將其拆解。
// 4. 您的 Vercel 伺服器觸發另一個 URL（在同一個伺服器上），以執行音樂搜索。
// 5. 音樂搜索服務返回結果，並將其發回給您的 Vercel 伺服器。
// 6. 您的 Vercel 伺服器將結果發回給 LineBot。
// 7. LineBot 將結果發回給用戶。
const webhook = (
  fastify: FastifyInstance,
  opts: FastifyServerOptions,
  done: any
) => {
  /**
   * @api {post} /webhook 接收line的webhook
   */
  fastify.post(
    routeLink.default,
    async (request: WebhookRequest, reply: FastifyReply) => {
      const r = JSON.stringify(request.body);
      const signature = crypto
        .createHmac("SHA256", process.env.LINE_CHANNEL_SECRET!)
        .update(r || "")
        .digest("base64")
        .toString();
      if (signature !== request.headers["x-line-signature"]) {
        console.log("Signature mismatch");
        console.log("Expected:", signature);
        console.log("Received:", request.headers["x-line-signature"]);
        return reply.status(401).send("Unauthorized");
      }

      // TODO: 要拆分出message 和 postback
      // 因為我們會回給user flex message
      // 用戶點選flex message的按鈕
      // 會觸發postback
      // 這個postback也會被送到webhook 那要做的事情是把該postback的data 加入到spotify的播放清單中
      const body = request.body;
      const events = body.events;
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

  /**
   * 處理 GET 請求
   */
  fastify.get(routeLink.default, async (request, reply) => {
    console.log("Received GET request at /webhook");
    return reply.status(200).send("Webhook GET route is active");
  });

  done();
};

/**
 * 處理message事件
 * @param body
 * @returns
 */
const handleMessageEvent = async (body: MessageEvent) => {
  const type = body.message.type;
  switch (type) {
    case "text":
      const text = body.message.text;
      return await handleTextEventMessage(text, body.replyToken);
    default:
      break;
  }
};

/**
 * 處理postback事件
 * @param postbackEvent
 * @returns
 */
const handlePostbackEvent = async (postbackEvent: PostbackEvent) => {
  const { data, params = "" } = postbackEvent.postback;
  const replyToken = postbackEvent.replyToken;

  const searchParams = new URLSearchParams(data);
  const { action, uri, position, next, type, market, limit, offset } =
    Object.fromEntries(searchParams.entries());
  // 根據action決定要去做什麼事情
  switch (action) {
    case actionCommands.ADD_TRACK:
      const searchResponse = await fetch(
        `${process.env.BASE_URL}${routeLink.playlist}${playlistLink.add}?uri=${uri}&position=${position}`
      );
      if (_isEqual(searchResponse.status, 200)) {
        return await lineUtils.replayMessage(replyToken, {
          type: "text",
          text: "已加入歌單",
        });
      }
      break;
    case actionCommands.NEXT_PAGE:
    case actionCommands.PERVIOUS_PAGE:
      const decodedNext = decodeURIComponent(next);
      const spotifyResponse = await httpUtils.httpFetchGetWithToken({
        url:
          next +
          `&type=${type}&market=${market}&limit=${limit}&offset=${offset}`,
      });
      const errorStatus = _get(spotifyResponse, "error.status");
      if (errorStatus) {
        return await lineUtils.replayMessage(replyToken, {
          type: "text",
          text: `postback${searchParams} 連結${decodedNext} 錯誤內容${JSON.stringify(
            spotifyResponse
          )}`,
        });
      } else {
        const { result, prevUrl, nextUrl, limit, offset, total } =
          processUtils.filterSearch(spotifyResponse);
        const message = lineUtils.generateMessageTemplate();
        message.contents.body.contents = await result.map(
          (item: filterSearchType) => {
            return lineUtils.generateFlexbox(item);
          }
        );
        const footerData = {
          prevUrl: prevUrl,
          nextUrl: nextUrl,
          limit: limit,
          offset: offset,
        } as footerActionType;
        message.contents.footer.contents = [
          lineUtils.generateFooter(footerData),
        ] as never[];
        await lineUtils.replayMessage(replyToken, message);
        return message;
      }
    default:
      break;
  }
};

/**
 * 處理text事件
 * @param text
 * @param replyToken
 * @returns
 */
const handleTextEventMessage = async (text: string, replyToken: string) => {
  const encodedKeyword = encodeURIComponent(text);
  const searchResponse = await fetch(
    `${process.env.BASE_URL}${routeLink.search}?keyWord=${encodedKeyword}`
  );
  if (_isEqual(searchResponse.status, 200)) {
    const searchData = await searchResponse.json();
    const { result, prevUrl, nextUrl, limit, offset, total } =
      processUtils.filterSearch(searchData);

    try {
      const message = lineUtils.generateMessageTemplate();
      message.contents.body.contents = await result.map(
        (item: filterSearchType) => {
          return lineUtils.generateFlexbox(item);
        }
      );
      const footerData = {
        prevUrl,
        nextUrl,
        limit,
        offset,
      } as footerActionType;
      message.contents.footer.contents = [
        lineUtils.generateFooter(footerData),
      ] as never[];
      await lineUtils.replayMessage(replyToken, message);
      return message;
    } catch (error) {
      console.log(error);
    }
  }
  return null;
};

export default webhook;
