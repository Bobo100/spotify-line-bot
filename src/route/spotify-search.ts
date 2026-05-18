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
      try {
        const data = await searchTracks(request.query.keyWord);
        await processUtils.processResponseAndReturn(data, reply);
      } catch (error) {
        reply.code(500).send(error);
      }
    }
  );
  done();
};

export default search;
