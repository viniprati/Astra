const { env } = require("../config/env");
const { logger } = require("./logger");

async function isBotOwner(client, userId) {
  if (env.BOT_OWNER_IDS.includes(userId)) {
    return true;
  }

  const application = await client.application.fetch().catch((error) => {
    logger.warn({ event: "application_owner_fetch_failed", error: error.message }, "application owner fetch failed");
    return null;
  });

  const owner = application?.owner;

  if (!owner) {
    return false;
  }

  if (owner.id === userId) {
    return true;
  }

  if (owner.members?.has?.(userId)) {
    return true;
  }

  return false;
}

module.exports = { isBotOwner };
