const { Client, Collection, GatewayIntentBits, Partials } = require("discord.js");
const { createCache } = require("./cache/cache");
const { loadCommands } = require("./loaders/commands");
const { loadEvents } = require("./loaders/events");
const { connectMongo } = require("./database/mongo");
const { env } = require("./config/env");
const { logger } = require("./lib/logger");
const { startHealthServer } = require("./observability/healthServer");
const { startScheduler } = require("./jobs/scheduler");

async function main() {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Channel],
  });

  client.commands = new Collection();
  client.cache = createCache();
  client.db = await connectMongo();
  client.db.cache = client.cache;

  await loadCommands(client);
  await loadEvents(client);

  startHealthServer(client);
  startScheduler(client);
  await client.login(env.DISCORD_TOKEN);
}

main().catch((error) => {
  logger.error({ event: "fatal_error", error: error.message, stack: error.stack }, "fatal error");
  process.exit(1);
});
