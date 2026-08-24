const { Events } = require("discord.js");
const { env } = require("../config/env");
const { logger } = require("../lib/logger");
const { syncApplicationCommands } = require("../services/commandSyncService");

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
    }, "bot ready");

    if (!env.AUTO_DEPLOY_COMMANDS) {
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
