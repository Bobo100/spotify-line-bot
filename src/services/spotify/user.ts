import _get from "lodash/get";
import httpUtils from "../../utils/httpUtils";
import mongoDbUtils from "../../utils/mongoDbUtils";

export const fetchAndStoreProfile = async (
  lineUserId: string
): Promise<string | null> => {
  const data = await httpUtils.httpFetchGetWithToken({
    lineUserId,
    url: "https://api.spotify.com/v1/me",
  });
  if (_get(data, "error.status")) return null;
  const spotifyUserId = _get(data, "id");
  if (!spotifyUserId) return null;
  await mongoDbUtils.updateUserId(lineUserId, spotifyUserId);
  return spotifyUserId;
};
