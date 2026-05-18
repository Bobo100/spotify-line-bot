import _get from "lodash/get";
import { app } from "../../api/serverless";

const COLLECTION = "users";

const collection = () => app.mongo.db?.collection(COLLECTION);

const utils = {
  getTokens: async (
    lineUserId: string
  ): Promise<{ access_token?: string; refresh_token?: string }> => {
    const doc = await collection()?.findOne({ lineUserId });
    return {
      access_token: _get(doc, "access_token"),
      refresh_token: _get(doc, "refresh_token"),
    };
  },
  updateTokens: async (
    lineUserId: string,
    tokens: { access_token: string; refresh_token: string }
  ) => {
    await collection()?.updateOne(
      { lineUserId },
      {
        $set: {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
        },
        $setOnInsert: { lineUserId },
      },
      { upsert: true }
    );
  },
  getUserId: async (lineUserId: string): Promise<string | undefined> => {
    const doc = await collection()?.findOne({ lineUserId });
    return _get(doc, "spotifyUserId");
  },
  updateUserId: async (lineUserId: string, spotifyUserId: string) => {
    await collection()?.updateOne(
      { lineUserId },
      { $set: { spotifyUserId }, $setOnInsert: { lineUserId } },
      { upsert: true }
    );
  },
  getPlaylistId: async (lineUserId: string): Promise<string | undefined> => {
    const doc = await collection()?.findOne({ lineUserId });
    return _get(doc, "playlistId");
  },
  updatePlaylistId: async (lineUserId: string, playlistId: string) => {
    await collection()?.updateOne(
      { lineUserId },
      { $set: { playlistId }, $setOnInsert: { lineUserId } },
      { upsert: true }
    );
  },
  hasTokens: async (lineUserId: string): Promise<boolean> => {
    const doc = await collection()?.findOne({ lineUserId });
    return Boolean(_get(doc, "access_token") && _get(doc, "refresh_token"));
  },
};

export default utils;
