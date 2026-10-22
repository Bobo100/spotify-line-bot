import httpUtils from "../../utils/httpUtils";
import mongoDbUtils from "../../utils/mongoDbUtils";

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

export const listWritablePlaylists = async (
  lineUserId: string
): Promise<{ ok: boolean; playlists: WritablePlaylist[]; error?: string }> => {
  const spotifyUserId = await mongoDbUtils.getUserId(lineUserId);
  if (!spotifyUserId) {
    return { ok: false, playlists: [], error: "Spotify user not linked" };
  }
  const data = await httpUtils.httpFetchGetWithToken({
    lineUserId,
    url: "https://api.spotify.com/v1/me/playlists?limit=50",
  });
  if (data?.error) {
    return { ok: false, playlists: [], error: data.error.message };
  }
  const items: any[] = Array.isArray(data?.items) ? data.items : [];
  const playlists = items
    .filter(
      (item) =>
        item && (item.owner?.id === spotifyUserId || item.collaborative)
    )
    .map((item) => ({ id: item.id as string, name: item.name as string }));
  return { ok: true, playlists };
};

export const selectPlaylist = async (
  lineUserId: string,
  playlistId: string
): Promise<{ ok: boolean; name?: string; error?: string }> => {
  const result = await listWritablePlaylists(lineUserId);
  if (!result.ok) return { ok: false, error: result.error };
  const target = result.playlists.find((p) => p.id === playlistId);
  if (!target) {
    return { ok: false, error: "找不到這個歌單，或你沒有權限加歌" };
  }
  await mongoDbUtils.updatePlaylistId(lineUserId, target.id);
  return { ok: true, name: target.name };
};

export const NO_PLAYLIST_ERROR = "尚未選擇歌單，請輸入「歌單」選擇要加入的歌單";

export const addTrackToPlaylist = async (
  lineUserId: string,
  uri: string,
  position?: number | string
): Promise<{ ok: boolean; data?: any; error?: string }> => {
  const playlist_id = await mongoDbUtils.getPlaylistId(lineUserId);
  if (!playlist_id) {
    return { ok: false, error: NO_PLAYLIST_ERROR };
  }
  const body: { uris: string[]; position?: number | string } = { uris: [uri] };
  if (position !== undefined && position !== null && position !== "") {
    body.position = position;
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
