import {
  FastifyInstance,
  FastifyServerOptions,
  FastifyRequest,
  FastifyReply,
} from "fastify";
import { fetchAndStoreProfile } from "../services/spotify/user";
import { userLink } from "../utils/routeLink";

type ProfileRequest = FastifyRequest<{
  Querystring: { lineUserId: string };
}>;

const user = (
  fastify: FastifyInstance,
  opts: FastifyServerOptions,
  done: any
) => {
  fastify.get(
    userLink.profile,
    async (request: ProfileRequest, reply: FastifyReply) => {
      const { lineUserId } = request.query;
      if (!lineUserId) return reply.code(400).send("Missing lineUserId");
      const spotifyUserId = await fetchAndStoreProfile(lineUserId);
      if (!spotifyUserId) return reply.code(500).send("Failed to fetch profile");
      return reply.code(200).send({ spotifyUserId });
    }
  );

  done();
};

export default user;
