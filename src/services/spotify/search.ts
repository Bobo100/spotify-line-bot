import httpUtils from "../../utils/httpUtils";

type SearchOptions = {
  type?: string;
  market?: string;
  limit?: number;
  offset?: number;
};

export const searchTracks = async (
  lineUserId: string,
  keyword: string,
  options: SearchOptions = {}
): Promise<any> => {
  const params = new URLSearchParams();
  params.append("query", keyword);
  params.append("type", options.type ?? "track");
  params.append("market", options.market ?? "TW");
  params.append("limit", String(options.limit ?? 10));
  params.append("offset", String(options.offset ?? 0));
  return await httpUtils.httpFetchGetWithToken({
    lineUserId,
    url: "https://api.spotify.com/v1/search?" + params.toString(),
  });
};

export const fetchSpotifyUrl = async (
  lineUserId: string,
  url: string
): Promise<any> => {
  return await httpUtils.httpFetchGetWithToken({ lineUserId, url });
};
