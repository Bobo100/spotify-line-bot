import _get from "lodash/get";
import _isEqual from "lodash/isEqual";
import mongoDbUtils from "./mongoDbUtils";
import { refreshAccessToken } from "../services/spotify/auth";

interface HttpFetchPostProps {
  url: string;
  headers?: any;
  body?: any;
}

interface HttpFetchGetProps {
  url: string;
  headers?: any;
  body?: any;
}

const utils = {
  /**
   * 帶有token的post
   */
  httpFetchPostWithToken: async (props: HttpFetchPostProps): Promise<any> => {
    const { url, headers = {}, body = {} } = props;
    const { access_token } = await mongoDbUtils.getTokens();
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
      const refreshed = await refreshAccessToken();
      if (refreshed) return await utils.httpFetchPostWithToken(props);
    }
    return data;
  },
  /**
   * 沒帶token的post
   */
  httpFetchPost: async (props: HttpFetchPostProps): Promise<any> => {
    const { url, headers = {}, body = {} } = props;
    const spotifyResponse = await fetch(url, {
      method: "POST",
      headers: headers,
      body: body,
    });
    return await spotifyResponse.json();
  },
  /**
   * 帶有token的get
   */
  httpFetchGetWithToken: async (props: HttpFetchGetProps): Promise<any> => {
    const { url, headers = {} } = props;
    const { access_token } = await mongoDbUtils.getTokens();
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
      const refreshed = await refreshAccessToken();
      if (refreshed) return await utils.httpFetchGetWithToken(props);
    }
    return data;
  },
  /**
   * 沒帶token的get
   */
  httpFetchGet: async (props: HttpFetchGetProps): Promise<any> => {
    const { url, headers = {} } = props;
    const spotifyResponse = await fetch(url, {
      method: "GET",
      headers: headers,
    });
    return await spotifyResponse.json();
  },
};
export default utils;
