const { Client, Collection, GatewayIntentBits, Partials } = require("discord.js");
const { createCache } = require("./cache/cache");
const { loadCommands } = require("./loaders/commands");
const { loadEvents } = require("./loaders/events");
const { connectMongo } = require("./database/mongo");
const { env } = require("./config/env");
const { logger } = require("./lib/logger");
const { startHealthServer } = require("./observability/healthServer");
const { startScheduler } = require("./jobs/scheduler");
const { trackEvent } = require("./analytics/posthog");

const resources = {
  client: null,
  cache: null,
  db: null,
  healthServer: null,
  scheduler: null,
};

let shuttingDown = false;

function getIntents() {
  const intents = [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
  ];

  if (env.MESSAGE_CONTENT_INTENT) {
    intents.push(GatewayIntentBits.MessageContent);
  }

  return intents;
}

function closeServer(server) {
  if (!server) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    server.close(() => resolve());
  });
}

async function shutdown(reason, exitCode = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  logger.info({ event: "shutdown_start", reason }, "shutdown start");

  if (resources.scheduler) {
    clearInterval(resources.scheduler);
  }

  await closeServer(resources.healthServer).catch((error) => {
    logger.warn({ event: "health_server_close_failed", error: error.message }, "health server close failed");
  });

  if (resources.client) {
    resources.client.destroy();
  }

  if (resources.db?.close) {
    await resources.db.close().catch((error) => {
      logger.warn({ event: "mongo_close_failed", error: error.message }, "mongo close failed");
    });
  }

  if (resources.cache?.close) {
    await resources.cache.close().catch((error) => {
      logger.warn({ event: "cache_close_failed", error: error.message }, "cache close failed");
    });
  }

  logger.info({ event: "shutdown_complete", reason }, "shutdown complete");
  process.exit(exitCode);
}

async function main() {
  const client = new Client({
    intents: getIntents(),
    partials: [Partials.Channel],
  });

  resources.client = client;
  client.commands = new Collection();
  client.cache = createCache();
  resources.cache = client.cache;
  client.db = await connectMongo();
  client.db.cache = client.cache;
  resources.db = client.db;

  await loadCommands(client);
  await loadEvents(client);

  resources.healthServer = startHealthServer(client);
  resources.scheduler = startScheduler(client);
  await client.login(env.DISCORD_TOKEN);
}

process.on("SIGINT", () => {
  shutdown("SIGINT").catch((error) => {
    logger.error({ event: "shutdown_failed", error: error.message, stack: error.stack }, "shutdown failed");
    process.exit(1);
  });
});

process.on("SIGTERM", () => {
  shutdown("SIGTERM").catch((error) => {
    logger.error({ event: "shutdown_failed", error: error.message, stack: error.stack }, "shutdown failed");
    process.exit(1);
  });
});

process.on("unhandledRejection", (error) => {
  logger.error({
    event: "unhandled_rejection",
    error: error?.message || String(error),
    stack: error?.stack,
  }, "unhandled rejection");
  trackEvent("bot_error", "astra-runtime", {
    error_type: "unhandled_rejection",
    environment: env.NODE_ENV,
    $process_person_profile: false,
  });
});

main().catch(async (error) => {
  logger.error({ event: "fatal_error", error: error.message, stack: error.stack }, "fatal error");
  await trackEvent("bot_error", "astra-runtime", {
    error_type: "fatal_error",
    environment: env.NODE_ENV,
    $process_person_profile: false,
  });
  shutdown("fatal_error", 1).catch(() => process.exit(1));
});
