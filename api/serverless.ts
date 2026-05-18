// Read the .env file.
import dotenv from "dotenv";
dotenv.config({ path: `.env.local`, override: true });

// Require the framework
import Fastify from "fastify";
import { FastifyRequest, FastifyReply } from "fastify";
import cookie from "@fastify/cookie";
import { FastifyCookieOptions } from "@fastify/cookie";
import spotify from "../src/route/spotify";
import mongodb from "@fastify/mongodb";
import { routeLink } from "../src/utils/routeLink";
import webhook from "../src/route/webhook";
import search from "../src/route/spotify-search";
import playlist from "../src/route/spotify-playlist";
import user from "../src/route/spotify-user";

// Instantiate Fastify with some config
const app = Fastify({
  logger: true,
});

app.register(mongodb, {
  url: `mongodb+srv://${process.env.USER_NAME}:${process.env.MONGODB_PASSEWORD}@cluster0.yjz075d.mongodb.net/${process.env.DATABASE_NAME}?retryWrites=true&w=majority&appName=Cluster0`,
});

app.register(cookie, {
  secret: process.env.COOKIE_SECRET!,
  parseOptions: {},
} as FastifyCookieOptions);

app.register(spotify, { prefix: routeLink.spotify });
app.register(user, { prefix: routeLink.user });
app.register(search, { prefix: routeLink.search });
app.register(playlist, { prefix: routeLink.playlist });

app.register(webhook, { prefix: routeLink.webhook });

app.listen({ port: 3000 }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Server listening at ${address}`);
});

export default async (req: FastifyRequest, res: FastifyReply) => {
  await app.ready();
  app.server.emit("request", req, res);
};

export { app };
