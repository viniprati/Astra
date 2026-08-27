const { Events } = require("discord.js");
const { env } = require("../config/env");
const { logger } = require("../lib/logger");
const { setRuntimeMetrics } = require("../observability/metrics");
const { syncApplicationCommands } = require("../services/commandSyncService");

function shouldAutoSyncCommands(client) {
  if (!env.AUTO_DEPLOY_COMMANDS) {
    return false;
  }

  const shardId = client.shard?.ids?.[0];
  return shardId === undefined || shardId === 0;
}

module.exports = {
  name: Events.ClientReady,
  once: true,

  async execute(client) {
    logger.info({
      event: "bot_ready",
      userId: client.user.id,
      tag: client.user.tag,
      guildCount: client.guilds.cache.size,
      commandScope: env.COMMAND_SCOPE,
      shardIds: client.shard?.ids || null,
    }, "bot ready");
    setRuntimeMetrics(client);

    if (!shouldAutoSyncCommands(client)) {
      logger.info({
        event: "auto_sync_skipped",
        reason: env.AUTO_DEPLOY_COMMANDS ? "non_primary_shard" : "disabled",
        shardIds: client.shard?.ids || null,
      }, "auto sync skipped");
      return;
    }

    const results = await syncApplicationCommands(client).catch((error) => {
      logger.error({ event: "auto_sync_failed", error: error.message, stack: error.stack }, "auto sync failed");
      return null;
    });

    if (results) {
      logger.info({ event: "auto_sync_completed", results }, "auto sync completed");
    }
  },
};
