import httpUtils from "../../utils/httpUtils";
import mongoDbUtils from "../../utils/mongoDbUtils";

export const listPlaylists = async (): Promise<any> => {
  const userId = await mongoDbUtils.getUserId();
  const params = new URLSearchParams();
  params.append("limit", "10");
  params.append("offset", "0");
  return await httpUtils.httpFetchGetWithToken({
    url: `https://api.spotify.com/v1/users/${userId}/playlists?${params.toString()}`,
  });
};

export const addTrackToPlaylist = async (
  uri: string,
  position?: number | string
): Promise<{ ok: boolean; data?: any; error?: string }> => {
  const playlist_id = await mongoDbUtils.getPlaylistId();
  if (!playlist_id) {
    return { ok: false, error: "playlist_id 尚未設定" };
  }
  const body: { uris: string[]; position?: number | string } = { uris: [uri] };
  if (position !== undefined && position !== null && position !== "") {
    body.position = position;
  }
  const data = await httpUtils.httpFetchPostWithToken({
    url: `https://api.spotify.com/v1/playlists/${playlist_id}/tracks`,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (data?.error) {
    return { ok: false, data, error: data.error.message };
  }
  return { ok: true, data };
};
