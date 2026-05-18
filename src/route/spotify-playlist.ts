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
  fastify.get(
    playlistLink.playlists,
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const data = await listPlaylists();
      return reply.code(200).send(data);
    }
  );

  fastify.post(
    playlistLink.add,
    async (request: AddRequest, reply: FastifyReply) => {
      const { uri, position } = request.body;
      const result = await addTrackToPlaylist(uri, position);
      if (!result.ok) {
        return reply.code(400).send({ error: result.error, data: result.data });
      }
      return reply.code(200).send(result.data);
    }
  );

  done();
};

export default playlist;
