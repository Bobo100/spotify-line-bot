import _get from "lodash/get";
import _isEqual from "lodash/isEqual";
import mongoDbUtils from "./mongoDbUtils";
import { routeLink, authLink } from "./routeLink";

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

const refreshLink = `${process.env.BASE_URL}${routeLink.spotify}${authLink.refresh}`;

const utils = {
  /**
   * 帶有token的post
   * @param props
   * @returns
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
      await fetch(refreshLink, {
        method: "GET",
      });
      return await utils.httpFetchPostWithToken(props);
    }
    return data;
  },
  /**
   * 沒帶token的post
   * @param props
   * @returns
   */
  httpFetchPost: async (props: HttpFetchPostProps): Promise<any> => {
    const { url, headers = {}, body = {} } = props;
    const spotifyResponse = await fetch(url, {
      method: "POST",
      headers: headers,
      body: body,
    });
    const data = await spotifyResponse.json();
    const errorStatus = _get(data, "error.status");
    if (_isEqual(errorStatus, 401)) {
      await fetch(refreshLink, {
        method: "GET",
      });
      return await utils.httpFetchPost(props);
    }
    return data;
  },
  /**
   * 帶有token的get
   * @param props
   * @returns
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
      await fetch(refreshLink, {
        method: "GET",
      });
      return await utils.httpFetchGetWithToken(props);
    }
    return data;
  },
  /**
   * 沒帶token的get
   * @param props
   * @returns
   */
  httpFetchGet: async (props: HttpFetchGetProps): Promise<any> => {
    const { url, headers = {} } = props;
    const spotifyResponse = await fetch(url, {
      method: "GET",
      headers: headers,
    });
    const data = await spotifyResponse.json();
    const errorStatus = _get(data, "error.status");
    if (_isEqual(errorStatus, 401)) {
      await fetch(refreshLink, {
        method: "GET",
      });
      return await utils.httpFetchGet(props);
    }
    return data;
  },
};
export default utils;
