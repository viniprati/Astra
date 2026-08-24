const { MongoClient } = require("mongodb");
const { env } = require("../config/env");
const { logger } = require("../lib/logger");
const { blacklistRepository } = require("./repositories/blacklistRepository");
const { countRepository } = require("./repositories/countRepository");
const { guildConfigRepository } = require("./repositories/guildConfigRepository");
const { logRepository } = require("./repositories/logRepository");

async function connectMongo() {
  const client = new MongoClient(env.MONGO_URI);
  await client.connect();

  const db = client.db(env.DATABASE_NAME);

  await Promise.all([
    db.collection("guild_configs").createIndex({ guildId: 1 }, { unique: true }),
    db.collection("blacklists").createIndex({ guildId: 1, targetType: 1, targetValue: 1 }, { unique: true }),
    db.collection("partnership_counts").createIndex({ guildId: 1, userId: 1 }, { unique: true }),
    db.collection("logs").createIndex({ guildId: 1, createdAt: -1 }),
    db.collection("command_usage").createIndex({ guildId: 1, commandName: 1, createdAt: -1 }),
    db.collection("logs").createIndex({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 }),
  ]);

  logger.info({ event: "mongo_connected", database: env.DATABASE_NAME }, "mongo connected");

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
    repositories: {
      guildConfigs: guildConfigRepository(guildConfigs),
      blacklists: blacklistRepository(blacklists),
      counts: countRepository(counts),
      logs: logRepository(logs),
    },
  };
}

module.exports = { connectMongo };
