import {
  FastifyInstance,
  FastifyServerOptions,
  FastifyRequest,
  FastifyReply,
} from "fastify";
import processUtils from "../utils/processUtils";
import { searchTracks } from "../services/spotify/search";
import { searchLink } from "../utils/routeLink";

type SearchRequest = FastifyRequest<{
  Querystring: {
    keyWord: string;
    lineUserId: string;
  };
}>;

const search = (
  fastify: FastifyInstance,
  opts: FastifyServerOptions,
  done: any
) => {
  fastify.get(
    searchLink.default,
    async (request: SearchRequest, reply: FastifyReply) => {
      const { keyWord, lineUserId } = request.query;
      if (!lineUserId) return reply.code(400).send("Missing lineUserId");
      try {
        const data = await searchTracks(lineUserId, keyWord);
        await processUtils.processResponseAndReturn(data, reply);
      } catch (error) {
        reply.code(500).send(error);
      }
    }
  );
  done();
};

export default search;
