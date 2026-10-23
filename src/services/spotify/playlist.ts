import httpUtils from "../../utils/httpUtils";
import mongoDbUtils from "../../utils/mongoDbUtils";
import { fetchAndStoreProfile } from "./user";

export const listPlaylists = async (lineUserId: string): Promise<any> => {
  const spotifyUserId = await mongoDbUtils.getUserId(lineUserId);
  if (!spotifyUserId) {
    return { error: { message: "Spotify user not linked" } };
  }
  const params = new URLSearchParams();
  params.append("limit", "10");
  params.append("offset", "0");
  return await httpUtils.httpFetchGetWithToken({
    lineUserId,
    url: `https://api.spotify.com/v1/users/${spotifyUserId}/playlists?${params.toString()}`,
  });
};

export type WritablePlaylist = { id: string; name: string };

export const RELOGIN_ERROR = "Spotify 登入已失效，請輸入 login 重新登入";
const NOT_WRITABLE_ERROR = "找不到這個歌單，或你沒有權限加歌";
const SPOTIFY_ID = /^[A-Za-z0-9]+$/;

const describeSpotifyError = (data: any): string =>
  data?.error?.status === 401
    ? RELOGIN_ERROR
    : data?.error?.message ?? "Spotify 回應錯誤";

// 登入時抓 profile 可能失敗，這裡補抓一次，避免使用者永遠卡在沒有 spotifyUserId
const ensureSpotifyUserId = async (
  lineUserId: string
): Promise<string | null> =>
  (await mongoDbUtils.getUserId(lineUserId)) ??
  (await fetchAndStoreProfile(lineUserId));

const isWritable = (playlist: any, spotifyUserId: string): boolean =>
  Boolean(
    playlist &&
      (playlist.owner?.id === spotifyUserId || playlist.collaborative)
  );

export const listWritablePlaylists = async (
  lineUserId: string
): Promise<{ ok: boolean; playlists: WritablePlaylist[]; error?: string }> => {
  const spotifyUserId = await ensureSpotifyUserId(lineUserId);
  if (!spotifyUserId) {
    return { ok: false, playlists: [], error: RELOGIN_ERROR };
  }
  const data = await httpUtils.httpFetchGetWithToken({
    lineUserId,
    url: "https://api.spotify.com/v1/me/playlists?limit=50",
  });
  if (data?.error) {
    return { ok: false, playlists: [], error: describeSpotifyError(data) };
  }
  const items: any[] = Array.isArray(data?.items) ? data.items : [];
  const playlists = items
    .filter((item) => isWritable(item, spotifyUserId))
    .map((item) => ({ id: item.id as string, name: item.name as string }));
  return { ok: true, playlists };
};

export const selectPlaylist = async (
  lineUserId: string,
  playlistId: string
): Promise<{ ok: boolean; name?: string; error?: string }> => {
  if (!playlistId || !SPOTIFY_ID.test(playlistId)) {
    return { ok: false, error: NOT_WRITABLE_ERROR };
  }
  const spotifyUserId = await ensureSpotifyUserId(lineUserId);
  if (!spotifyUserId) return { ok: false, error: RELOGIN_ERROR };
  const data = await httpUtils.httpFetchGetWithToken({
    lineUserId,
    url: `https://api.spotify.com/v1/playlists/${playlistId}?fields=id,name,owner.id,collaborative`,
  });
  if (data?.error) {
    return {
      ok: false,
      error:
        data.error.status === 404
          ? NOT_WRITABLE_ERROR
          : describeSpotifyError(data),
    };
  }
  if (!isWritable(data, spotifyUserId)) {
    return { ok: false, error: NOT_WRITABLE_ERROR };
  }
  await mongoDbUtils.updatePlaylistId(lineUserId, data.id);
  return { ok: true, name: data.name };
};

export const NO_PLAYLIST_ERROR = "尚未選擇歌單，請輸入「歌單」選擇要加入的歌單";

const POSITION_ERROR = "position 必須是 0 以上的整數";

// 沒給 position 代表加到最後一首；舊訊息的按鈕會送出字串 "null"，也當成沒給
const parsePosition = (
  position?: number | string
): { valid: true; value?: number } | { valid: false } => {
  if (position === undefined || position === "" || position === "null") {
    return { valid: true };
  }
  if (typeof position === "number") {
    return Number.isSafeInteger(position) && position >= 0
      ? { valid: true, value: position }
      : { valid: false };
  }
  return /^\d+$/.test(position)
    ? { valid: true, value: Number(position) }
    : { valid: false };
};

export const addTrackToPlaylist = async (
  lineUserId: string,
  uri: string,
  position?: number | string
): Promise<{ ok: boolean; data?: any; error?: string }> => {
  const parsedPosition = parsePosition(position);
  if (!parsedPosition.valid) {
    return { ok: false, error: POSITION_ERROR };
  }
  const playlist_id = await mongoDbUtils.getPlaylistId(lineUserId);
  if (!playlist_id) {
    return { ok: false, error: NO_PLAYLIST_ERROR };
  }
  const body: { uris: string[]; position?: number } = { uris: [uri] };
  if (parsedPosition.value !== undefined) {
    body.position = parsedPosition.value;
  }
  const data = await httpUtils.httpFetchPostWithToken({
    lineUserId,
    url: `https://api.spotify.com/v1/playlists/${playlist_id}/tracks`,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (data?.error) {
    return { ok: false, data, error: data.error.message };
  }
  return { ok: true, data };
};
