import _get from "lodash/get";
import mongoDbUtils from "../../utils/mongoDbUtils";

export const refreshAccessToken = async (): Promise<boolean> => {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const { refresh_token } = await mongoDbUtils.getTokens();
  if (!refresh_token) return false;

  const params = new URLSearchParams();
  params.append("client_id", clientId!);
  params.append("grant_type", "refresh_token");
  params.append("refresh_token", refresh_token);

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });
  const data = await response.json();
  const new_access_token = _get(data, "access_token");
  const new_refresh_token = _get(data, "refresh_token", refresh_token);
  if (new_access_token) {
    await mongoDbUtils.updateTokens({
      access_token: new_access_token,
      refresh_token: new_refresh_token,
    });
    return true;
  }
  return false;
};
