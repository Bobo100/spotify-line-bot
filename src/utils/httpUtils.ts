import _get from "lodash/get";
import _isEqual from "lodash/isEqual";
import mongoDbUtils from "./mongoDbUtils";
import { refreshAccessToken } from "../services/spotify/auth";

interface HttpFetchProps {
  url: string;
  headers?: any;
  body?: any;
}

interface AuthedFetchProps extends HttpFetchProps {
  lineUserId: string;
}

const utils = {
  httpFetchPostWithToken: async (props: AuthedFetchProps): Promise<any> => {
    const { url, headers = {}, body = {}, lineUserId } = props;
    const { access_token } = await mongoDbUtils.getTokens(lineUserId);
    const spotifyResponse = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access_token}`,
        ...headers,
      },
      body: body,
    });
    const data = await spotifyResponse.json();
    const errorStatus = _get(data, "error.status");
    if (_isEqual(errorStatus, 401)) {
      const refreshed = await refreshAccessToken(lineUserId);
      if (refreshed) return await utils.httpFetchPostWithToken(props);
    }
    return data;
  },
  httpFetchPost: async (props: HttpFetchProps): Promise<any> => {
    const { url, headers = {}, body = {} } = props;
    const spotifyResponse = await fetch(url, {
      method: "POST",
      headers: headers,
      body: body,
    });
    return await spotifyResponse.json();
  },
  httpFetchGetWithToken: async (props: AuthedFetchProps): Promise<any> => {
    const { url, headers = {}, lineUserId } = props;
    const { access_token } = await mongoDbUtils.getTokens(lineUserId);
    const spotifyResponse = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${access_token}`,
        ...headers,
      },
    });
    const data = await spotifyResponse.json();
    const errorStatus = _get(data, "error.status");
    if (_isEqual(errorStatus, 401)) {
      const refreshed = await refreshAccessToken(lineUserId);
      if (refreshed) return await utils.httpFetchGetWithToken(props);
    }
    return data;
  },
  httpFetchGet: async (props: HttpFetchProps): Promise<any> => {
    const { url, headers = {} } = props;
    const spotifyResponse = await fetch(url, {
      method: "GET",
      headers: headers,
    });
    return await spotifyResponse.json();
  },
};
export default utils;
