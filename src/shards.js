const { ShardingManager } = require("discord.js");
const { env } = require("./config/env");
const { logger } = require("./lib/logger");

const manager = new ShardingManager("./index.js", {
  token: env.DISCORD_TOKEN,
  totalShards: "auto",
  respawn: true,
});

manager.on("shardCreate", (shard) => {
  logger.info({ event: "shard_created", shardId: shard.id }, "shard created");

  shard.on("death", () => {
    logger.warn({ event: "shard_died", shardId: shard.id }, "shard died");
  });
});

manager.spawn().catch((error) => {
  logger.error({ event: "shard_spawn_failed", error: error.message, stack: error.stack }, "shard spawn failed");
  process.exit(1);
});
