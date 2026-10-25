import {
  FastifyInstance,
  FastifyServerOptions,
  FastifyRequest,
  FastifyReply,
} from "fastify";
import {
  WebhookRequestBody,
  MessageEvent,
  PostbackEvent,
  validateSignature,
} from "@line/bot-sdk";
import _get from "lodash/get";
import processUtils from "../utils/processUtils";
import lineUtils from "../utils/lineUtils";
import mongoDbUtils from "../utils/mongoDbUtils";
import {
  filterSearchType,
  actionCommands,
  footerActionType,
} from "../utils/lineType";
import { routeLink, authLink } from "../utils/routeLink";
import { searchTracks, fetchSpotifyUrl } from "../services/spotify/search";
import {
  addTrackToPlaylist,
  listWritablePlaylists,
  selectPlaylist,
} from "../services/spotify/playlist";
import { createLoginToken } from "../services/spotify/loginToken";

type WebhookRequest = FastifyRequest<{
  Body: WebhookRequestBody;
}>;

const signatureVerified = new WeakSet<FastifyRequest>();

const unauthorizedError = () =>
  Object.assign(new Error("Unauthorized"), { statusCode: 401 });

const webhook = (
  fastify: FastifyInstance,
  opts: FastifyServerOptions,
  done: any
) => {
  fastify.register(signedWebhookRoute);

  fastify.get(routeLink.default, async (_request, reply) => {
    return reply.status(200).send("Webhook GET route is active");
  });

  done();
};

// 驗簽用的 parser 只放在這個子範圍，只影響 LINE 的 POST webhook
const signedWebhookRoute = (
  scope: FastifyInstance,
  _opts: FastifyServerOptions,
  scopeDone: any
) => {
  // LINE 對原始 bytes 計算簽章，所以要在解析 JSON 之前、用原始 bytes 驗證
  const defaultJsonParser = scope.getDefaultJsonParser(
    scope.initialConfig.onProtoPoisoning ?? "error",
    scope.initialConfig.onConstructorPoisoning ?? "error"
  );
  scope.removeAllContentTypeParsers();
  scope.addContentTypeParser(
    "application/json",
    { parseAs: "buffer" },
    (request, body, parseDone) => {
      const signature = request.headers["x-line-signature"];
      if (typeof signature !== "string") {
        request.log.warn("LINE signature header missing");
        return parseDone(unauthorizedError(), undefined);
      }
      // parser 裡丟出的例外 Fastify 不會接住，會讓整個 process 掛掉，所以要自己轉成錯誤
      let valid: boolean;
      try {
        valid = validateSignature(
          body as Buffer,
          process.env.LINE_CHANNEL_SECRET!,
          signature
        );
      } catch (error) {
        return parseDone(error as Error, undefined);
      }
      if (!valid) {
        request.log.warn("LINE signature mismatch");
        return parseDone(unauthorizedError(), undefined);
      }
      signatureVerified.add(request);
      defaultJsonParser(request, (body as Buffer).toString("utf8"), parseDone);
    }
  );

  scope.post(
    routeLink.default,
    async (request: WebhookRequest, reply: FastifyReply) => {
      // 沒有 body 的請求不會經過上面的 parser，也就沒有驗過簽章
      if (!signatureVerified.has(request)) {
        request.log.warn("LINE signature missing: request has no body");
        throw unauthorizedError();
      }

      const events = request.body.events;
      await Promise.all(
        events.map(async (event) => {
          const lineUserId = _get(event, "source.userId");
          if (!lineUserId) return;
          try {
            switch (event.type) {
              case "message":
                return await handleMessageEvent(event, lineUserId);
              case "postback":
                return await handlePostbackEvent(event, lineUserId);
              default:
                return;
            }
          } catch (error) {
            request.log.error(error, "Failed to handle LINE event");
            const replyToken = _get(event, "replyToken");
            if (replyToken) {
              await lineUtils.replayMessage(replyToken, {
                type: "text",
                text: "發生錯誤，請稍後再試",
              });
            }
          }
        })
      );

      return reply.status(200).send();
    }
  );

  scopeDone();
};

const buildLoginReplyText = (lineUserId: string): string => {
  const token = createLoginToken(lineUserId);
  const url = `${process.env.BASE_URL}${routeLink.spotify}${authLink.login}?t=${token}`;
  return `請點以下連結登入 Spotify (10 分鐘內有效):\n${url}`;
};

const handleMessageEvent = async (
  body: MessageEvent,
  lineUserId: string
) => {
  if (body.message.type !== "text") return;
  return await handleTextEventMessage(body.message.text, body.replyToken, lineUserId);
};

const handlePostbackEvent = async (
  postbackEvent: PostbackEvent,
  lineUserId: string
) => {
  const { data } = postbackEvent.postback;
  const replyToken = postbackEvent.replyToken;

  if (!(await mongoDbUtils.hasTokens(lineUserId))) {
    return await lineUtils.replayMessage(replyToken, {
      type: "text",
      text: buildLoginReplyText(lineUserId),
    });
  }

  const searchParams = new URLSearchParams(data);
  const { action, uri, position, next, type, market, limit, offset, id } =
    Object.fromEntries(searchParams.entries());
  switch (action) {
    case actionCommands.SELECT_PLAYLIST: {
      const result = await selectPlaylist(lineUserId, id);
      return await lineUtils.replayMessage(replyToken, {
        type: "text",
        text: result.ok
          ? `已設定歌單：${result.name}`
          : `設定失敗：${result.error ?? ""}`,
      });
    }
    case actionCommands.ADD_TRACK: {
      const result = await addTrackToPlaylist(lineUserId, uri, position);
      return await lineUtils.replayMessage(replyToken, {
        type: "text",
        text: result.ok ? "已加入歌單" : `加入失敗: ${result.error ?? ""}`,
      });
    }
    case actionCommands.NEXT_PAGE:
    case actionCommands.PERVIOUS_PAGE: {
      const decodedNext = decodeURIComponent(next);
      const spotifyResponse = await fetchSpotifyUrl(
        lineUserId,
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

const handleTextEventMessage = async (
  text: string,
  replyToken: string,
  lineUserId: string
) => {
  if (text.trim().toLowerCase() === "login") {
    return await lineUtils.replayMessage(replyToken, {
      type: "text",
      text: buildLoginReplyText(lineUserId),
    });
  }

  if (!(await mongoDbUtils.hasTokens(lineUserId))) {
    return await lineUtils.replayMessage(replyToken, {
      type: "text",
      text: buildLoginReplyText(lineUserId),
    });
  }

  if (PLAYLIST_COMMANDS.includes(text.trim().toLowerCase())) {
    return await replyWithPlaylistChoices(replyToken, lineUserId);
  }

  try {
    const searchData = await searchTracks(lineUserId, text);
    if (_get(searchData, "error.status")) return null;
    return await replyWithSearchResult(replyToken, searchData);
  } catch (error) {
    console.log(error);
    return null;
  }
};

const PLAYLIST_COMMANDS = ["歌單", "playlists", "playlist"];

const replyWithPlaylistChoices = async (
  replyToken: string,
  lineUserId: string
) => {
  const [result, currentPlaylistId] = await Promise.all([
    listWritablePlaylists(lineUserId),
    mongoDbUtils.getPlaylistId(lineUserId),
  ]);
  if (!result.ok) {
    return await lineUtils.replayMessage(replyToken, {
      type: "text",
      text: `讀取歌單失敗：${result.error ?? ""}`,
    });
  }
  if (result.playlists.length === 0) {
    return await lineUtils.replayMessage(replyToken, {
      type: "text",
      text: "你還沒有可以加歌的歌單，請先到 Spotify 建立一個歌單，再輸入「歌單」選擇。",
    });
  }
  return await lineUtils.replayMessage(
    replyToken,
    lineUtils.generatePlaylistQuickReply(result.playlists, currentPlaylistId)
  );
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
