const { env } = require("../config/env");
const { logger } = require("../lib/logger");

function startScheduler(client) {
  if (!env.SCHEDULER_ENABLED) {
    return null;
  }

  const interval = setInterval(() => {
    logger.info({
      event: "bot_heartbeat",
      guildCount: client.guilds.cache.size,
      uptimeSeconds: Math.round(process.uptime()),
      ready: client.isReady(),
    }, "bot heartbeat");
  }, 5 * 60 * 1000);

  interval.unref();
  logger.info({ event: "scheduler_started" }, "scheduler started");
  return interval;
}

module.exports = { startScheduler };
