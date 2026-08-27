const { ShardingManager } = require("discord.js");
const { env } = require("./config/env");
const { logger } = require("./lib/logger");

function getTotalShards() {
  if (env.SHARD_TOTAL === "auto") {
    return "auto";
  }

  const total = Number(env.SHARD_TOTAL);

  if (!Number.isInteger(total) || total < 1) {
    throw new Error("SHARD_TOTAL deve ser 'auto' ou um inteiro >= 1.");
  }

  return total;
}

const manager = new ShardingManager("./index.js", {
  token: env.DISCORD_TOKEN,
  totalShards: getTotalShards(),
  respawn: env.SHARD_RESPAWN,
});

manager.on("shardCreate", (shard) => {
  logger.info({ event: "shard_created", shardId: shard.id }, "shard created");

  shard.on("ready", () => {
    logger.info({ event: "shard_ready", shardId: shard.id }, "shard ready");
  });

  shard.on("disconnect", () => {
    logger.warn({ event: "shard_disconnected", shardId: shard.id }, "shard disconnected");
  });

  shard.on("reconnecting", () => {
    logger.warn({ event: "shard_reconnecting", shardId: shard.id }, "shard reconnecting");
  });

  shard.on("error", (error) => {
    logger.error({ event: "shard_error", shardId: shard.id, error: error.message, stack: error.stack }, "shard error");
  });

  shard.on("death", () => {
    logger.warn({ event: "shard_died", shardId: shard.id }, "shard died");
  });
});

manager.spawn().catch((error) => {
  logger.error({ event: "shard_spawn_failed", error: error.message, stack: error.stack }, "shard spawn failed");
  process.exit(1);
});
