import {
  FastifyInstance,
  FastifyServerOptions,
  FastifyRequest,
  FastifyReply,
} from "fastify";
import { fetchAndStoreProfile } from "../services/spotify/user";
import { userLink } from "../utils/routeLink";

const user = (
  fastify: FastifyInstance,
  opts: FastifyServerOptions,
  done: any
) => {
  fastify.get(
    userLink.profile,
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const userId = await fetchAndStoreProfile();
      if (!userId) return reply.code(500).send("Failed to fetch profile");
      return reply.code(200).send({ userId });
    }
  );

  done();
};

export default user;
