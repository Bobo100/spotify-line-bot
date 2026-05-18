import {
  FastifyInstance,
  FastifyServerOptions,
  FastifyRequest,
  FastifyReply,
} from "fastify";
import {
  addTrackToPlaylist,
  listPlaylists,
} from "../services/spotify/playlist";
import { playlistLink } from "../utils/routeLink";

type ListRequest = FastifyRequest<{
  Querystring: { lineUserId: string };
}>;

type AddRequest = FastifyRequest<{
  Body: {
    uri: string;
    position?: number;
    lineUserId: string;
  };
}>;

const playlist = (
  fastify: FastifyInstance,
  opts: FastifyServerOptions,
  done: any
) => {
  fastify.get(
    playlistLink.playlists,
    async (request: ListRequest, reply: FastifyReply) => {
      const { lineUserId } = request.query;
      if (!lineUserId) return reply.code(400).send("Missing lineUserId");
      const data = await listPlaylists(lineUserId);
      return reply.code(200).send(data);
    }
  );

  fastify.post(
    playlistLink.add,
    async (request: AddRequest, reply: FastifyReply) => {
      const { uri, position, lineUserId } = request.body;
      if (!lineUserId) return reply.code(400).send("Missing lineUserId");
      const result = await addTrackToPlaylist(lineUserId, uri, position);
      if (!result.ok) {
        return reply.code(400).send({ error: result.error, data: result.data });
      }
      return reply.code(200).send(result.data);
    }
  );

  done();
};

export default playlist;
