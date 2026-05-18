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

export const addTrackToPlaylist = async (
  lineUserId: string,
  uri: string,
  position?: number | string
): Promise<{ ok: boolean; data?: any; error?: string }> => {
  const playlist_id = await mongoDbUtils.getPlaylistId(lineUserId);
  if (!playlist_id) {
    return { ok: false, error: "playlist_id 尚未設定" };
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
