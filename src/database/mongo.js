const { MongoClient } = require("mongodb");
const { env } = require("../config/env");
const { logger } = require("../lib/logger");
const { blacklistRepository } = require("./repositories/blacklistRepository");
const { countRepository } = require("./repositories/countRepository");
const { guildConfigRepository } = require("./repositories/guildConfigRepository");
const { logRepository } = require("./repositories/logRepository");

async function connectMongo() {
  logger.info({
    event: "mongo_connect_start",
    database: env.DATABASE_NAME,
    maxPoolSize: env.MONGO_MAX_POOL_SIZE,
    serverSelectionTimeoutMs: env.MONGO_SERVER_SELECTION_TIMEOUT_MS,
  }, "mongo connect start");

  const client = new MongoClient(env.MONGO_URI, {
    connectTimeoutMS: env.MONGO_CONNECT_TIMEOUT_MS,
    serverSelectionTimeoutMS: env.MONGO_SERVER_SELECTION_TIMEOUT_MS,
    maxPoolSize: env.MONGO_MAX_POOL_SIZE,
    minPoolSize: env.MONGO_MIN_POOL_SIZE,
  });

  client.on("serverClosed", (event) => {
    logger.warn({ event: "mongo_server_closed", address: event.address }, "mongo server closed");
  });

  await client.connect();

  const db = client.db(env.DATABASE_NAME);
  const indexStartedAt = Date.now();

  await Promise.all([
    db.collection("guild_configs").createIndex({ guildId: 1 }, { unique: true }),
    db.collection("blacklists").createIndex({ guildId: 1, targetType: 1, targetValue: 1 }, { unique: true }),
    db.collection("partnership_counts").createIndex({ guildId: 1, userId: 1 }, { unique: true }),
    db.collection("partnership_counts").createIndex({ guildId: 1, weeklyCount: -1, updatedAt: -1 }),
    db.collection("partnership_counts").createIndex({ guildId: 1, monthlyCount: -1, updatedAt: -1 }),
    db.collection("partnership_counts").createIndex({ guildId: 1, totalCount: -1, updatedAt: -1 }),
    db.collection("logs").createIndex({ guildId: 1, createdAt: -1 }),
    db.collection("command_usage").createIndex({ guildId: 1, commandName: 1, createdAt: -1 }),
    db.collection("command_usage").createIndex(
      { createdAt: 1 },
      { expireAfterSeconds: env.COMMAND_USAGE_TTL_DAYS * 24 * 60 * 60 },
    ),
    db.collection("logs").createIndex({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 }),
  ]);

  logger.info({
    event: "mongo_connected",
    database: env.DATABASE_NAME,
    indexDurationMs: Date.now() - indexStartedAt,
  }, "mongo connected");

  const guildConfigs = db.collection("guild_configs");
  const blacklists = db.collection("blacklists");
  const counts = db.collection("partnership_counts");
  const logs = db.collection("logs");

  return {
    client,
    db,
    guildConfigs,
    blacklists,
    counts,
    logs,
    commandUsage: db.collection("command_usage"),
    async close() {
      await client.close();
      logger.info({ event: "mongo_closed" }, "mongo closed");
    },
    repositories: {
      guildConfigs: guildConfigRepository(guildConfigs),
      blacklists: blacklistRepository(blacklists),
      counts: countRepository(counts),
      logs: logRepository(logs),
    },
  };
}

module.exports = { connectMongo };
