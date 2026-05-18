import {
  FastifyInstance,
  FastifyServerOptions,
  FastifyRequest,
  FastifyReply,
} from "fastify";
import _get from "lodash/get";
import processUtils from "../utils/processUtils";
import httpUtils from "../utils/httpUtils";
import { playlistLink } from "../utils/routeLink";
import mongoDbUtils from "../utils/mongoDbUtils";

type AddRequest = FastifyRequest<{
  Body: {
    uri: string;
    position?: number;
  };
}>;

const playlist = (
  fastify: FastifyInstance,
  opts: FastifyServerOptions,
  done: any
) => {
  /**
   * @api {get} /playlist/playlists 取得用戶的播放清單
   */
  fastify.get(
    playlistLink.playlists,
    async (request: FastifyRequest, reply: FastifyReply) => {
      // https://api.spotify.com/v1/users/{user_id}/playlists
      const Params = new URLSearchParams();
      Params.append("limit", "10");
      Params.append("offset", "0");
      const userId = await mongoDbUtils.getUserId();
      const spotifyResponse = await httpUtils.httpFetchGetWithToken({
        url: `https://api.spotify.com/v1/users/${userId}/playlists?${Params.toString()}`,
      });
    }
  );

  /**
   * @api {post} /playlist/add 加入歌曲到播放清單
   */
  fastify.post(
    playlistLink.add,
    async (request: AddRequest, reply: FastifyReply) => {
      const uri = request.body.uri;
      const position = request.body.position;
      // https://api.spotify.com/v1/playlists/{playlist_id}/tracks
      const playlist_id = "5Jjn8bXv6DekewlqTF90pS";
      const Params: { [key: string]: any } = {
        uris: [uri],
        // 不寫的話會預設加到最後一首
        // 那我們可以設定兩個action一個是加到最後一首，一個是加到第一首
      };
      if (position) {
        Params["position"] = position;
      }
      const spotifyResponse = await httpUtils.httpFetchPostWithToken({
        url: `https://api.spotify.com/v1/playlists/${playlist_id}/tracks`,
        body: JSON.stringify(Params),
      });
      await processUtils.processResponseAndReturn(spotifyResponse, reply);
    }
  );

  done();
};

export default playlist;
