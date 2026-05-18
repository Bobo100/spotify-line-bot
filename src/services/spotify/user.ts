import _get from "lodash/get";
import httpUtils from "../../utils/httpUtils";
import mongoDbUtils from "../../utils/mongoDbUtils";

export const fetchAndStoreProfile = async (): Promise<string | null> => {
  const data = await httpUtils.httpFetchGetWithToken({
    url: "https://api.spotify.com/v1/me",
  });
  if (_get(data, "error.status")) return null;
  const userId = _get(data, "id");
  if (!userId) return null;
  await mongoDbUtils.updateUserId(userId);
  return userId;
};
