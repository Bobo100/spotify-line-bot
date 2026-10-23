import {
  filterSearchType,
  footerActionType,
  actionCommands,
} from "../utils/lineType";
const LINE_HEADER = {
  "Content-Type": "application/json",
  Authorization: "Bearer " + process.env.LINE_CHANNEL_ACCESS_TOEKN,
};

const utils = {
  replayMessage: async (replyToken: string, message: any) => {
    try {
      const response = await fetch(`${process.env.LINE_MESSAGING_API}/reply`, {
        method: "POST",
        headers: LINE_HEADER,
        body: JSON.stringify({
          replyToken: replyToken,
          messages: [message],
        }),
      });
      if (!response.ok) {
        console.error(
          `LINE rejected reply (${response.status}): ${await response.text()}`
        );
      }
    } catch (error) {
      console.error(`Delivery to LINE failed (${error})`);
    }
  },
  generateMessageTemplate: () => {
    const message = {
      type: "flex",
      altText: "Your Spotify search result",
      contents: {
        type: "bubble",
        size: "giga",
        header: {
          type: "box",
          layout: "horizontal",
          contents: [
            {
              type: "text",
              text: "Powered by Spotify",
              color: "#ffffff",
              size: "xxs",
              align: "end",
              gravity: "center",
              position: "relative",
              weight: "regular",
            },
          ],
          paddingAll: "10px",
        },
        hero: {
          type: "image",
          url: "https://as2.ftcdn.net/v2/jpg/03/41/12/49/1000_F_341124942_vR2gEyR9kaELUfLRKbkC3qM7fwIfMSn7.jpg",
          size: "full",
          aspectRatio: "20:13",
          aspectMode: "cover",
        },
        body: {
          type: "box",
          layout: "vertical",
          contents: [],
          spacing: "none",
        },
        footer: {
          type: "box",
          layout: "horizontal",
          contents: [],
        },
        styles: {
          header: {
            backgroundColor: "#1DB954",
          },
          body: {
            backgroundColor: "#191414",
          },
          footer: {
            backgroundColor: "#191414",
          },
        },
      },
    };
    return message;
  },
  generateFlexbox: (data: filterSearchType) => {
    return {
      type: "box",
      layout: "horizontal",
      contents: [
        {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "image",
              aspectRatio: "4:3",
              aspectMode: "cover",
              url: data.images ? data.images : "",
            },
          ],
          flex: 0,
          cornerRadius: "5px",
          width: "20%",
          spacing: "none",
        },
        {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              size: "md",
              color: "#1DB954",
              style: "normal",
              weight: "bold",
              text: data.name,
              wrap: true,
            },
            {
              type: "text",
              size: "xxs",
              wrap: true,
              color: "#FFFFFF",
              text: `author`,
              // text: this.generateArtistList(track),
            },
          ],
          spacing: "none",
          width: "30%",
          margin: "md",
        },
        {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "button",
              action: utils.generateAddTrackPostbackButton("INSERT", {
                action: actionCommands.ADD_TRACK,
                uri: data.uri,
                position: "0",
              }),
              style: "primary",
              gravity: "bottom",
              color: "#1DB954",
              height: "sm",
            },
          ],
          spacing: "none",
          width: "20%",
          margin: "md",
          alignItems: "center",
          justifyContent: "center",
        },
        {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "button",
              action: utils.generateAddTrackPostbackButton("APPEND", {
                action: actionCommands.ADD_TRACK,
                uri: data.uri,
                position: null,
              }),
              style: "primary",
              gravity: "bottom",
              color: "#1DB954",
              height: "sm",
            },
          ],
          spacing: "none",
          width: "20%",
          margin: "md",
          alignItems: "center",
          justifyContent: "center",
        },
      ],
      backgroundColor: "#191414",
      spacing: "none",
      cornerRadius: "5px",
    };
  },
  generateFooter: (data: footerActionType) => {
    const template = {
      type: "box",
      layout: "horizontal",
      contents: [],
      backgroundColor: "#191414",
      spacing: "xl",
      cornerRadius: "5px",
    };

    const addButton = (label: string, action: string, next: string) => {
      template.contents.push({
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "button",
            action: utils.generateNextPagePostbackButton(label, {
              action: action,
              next: next,
            }),
            style: "primary",
            gravity: "bottom",
            color: "#1DB954",
            height: "sm",
          },
        ],
        spacing: "none",
        justifyContent: "center",
      } as never);
    };

    if (data.prevUrl) {
      addButton("上一頁", actionCommands.PERVIOUS_PAGE, data.prevUrl);
    }

    if (data.nextUrl) {
      addButton("下一頁", actionCommands.NEXT_PAGE, data.nextUrl);
    }
    return template;
  },
  /**
   * 產生postback button
   * @param title
   * @param payload
   * @returns
   * {
   *   "type": "postback",
   *   "label": "Buy",
   *   "data": "action=buy&itemid=111",
   *   "displayText": "Buy",
   *   "inputOption": "openKeyboard",
   *   "fillInText": "---\nName: \nPhone: \nBirthday: \n---"
   * }
   * payload: {
   *   action: actionCommands.ADD_TRACK,
   *   uri: data.uri,
   * }
   * 要轉換成action=actionCommands.ADD_TRACK&uri=data.uri
   */
  generateAddTrackPostbackButton: (
    title: string,
    payload: any
  ): { [key: string]: string } => {
    const params = new URLSearchParams({
      action: payload.action,
      uri: payload.uri,
    });
    if (payload.position !== null && payload.position !== undefined) {
      params.set("position", String(payload.position));
    }
    return {
      type: "postback",
      label: title,
      data: params.toString(),
    };
  },
  generateNextPagePostbackButton: (
    title: string,
    payload: any
  ): { [key: string]: string } => {
    return {
      type: "postback",
      label: title,
      data: `action=${payload.action}&next=${payload.next}`,
    };
  },
  generatePlaylistQuickReply: (
    playlists: { id: string; name: string }[],
    currentPlaylistId?: string
  ) => {
    const shown = playlists.slice(0, MAX_QUICK_REPLY_ITEMS);
    const current = playlists.find((p) => p.id === currentPlaylistId);
    const currentLine = current
      ? `目前歌單：${current.name}`
      : currentPlaylistId
      ? "目前已選歌單（不在下方清單中）"
      : "目前還沒選歌單";
    const lines = [
      currentLine,
      "請選擇要加入歌曲的歌單：",
    ];
    if (playlists.length > shown.length) {
      lines.push(`（只顯示前 ${MAX_QUICK_REPLY_ITEMS} 個）`);
    }
    return {
      type: "text",
      text: lines.join("\n"),
      quickReply: {
        items: shown.map((p) => ({
          type: "action",
          action: {
            type: "postback",
            label: truncate(p.name || "(未命名)", MAX_LABEL_LENGTH),
            data: new URLSearchParams({
              action: actionCommands.SELECT_PLAYLIST,
              id: p.id,
            }).toString(),
            displayText: `選擇歌單：${truncate(p.name || "(未命名)", 100)}`,
          },
        })),
      },
    };
  },
};

// LINE 限制：quick reply 最多 13 個按鈕，按鈕文字最多 20 字
const MAX_QUICK_REPLY_ITEMS = 13;
const MAX_LABEL_LENGTH = 20;

// Intl.Segmenter 不在 es2017 的型別定義裡，但 Node 24 有提供
const segmenter = new (Intl as any).Segmenter(undefined, {
  granularity: "grapheme",
});

// 不確定 LINE 用字形還是 UTF-16 計算長度，兩種都控制在 max 以內，且不切開組合 emoji
const truncate = (text: string, max: number): string => {
  if (text.length <= max) return text;
  let result = "";
  for (const { segment } of segmenter.segment(text)) {
    if (result.length + segment.length + 1 > max) break;
    result += segment;
  }
  return result + "…";
};

export default utils;
