const { REST, Routes } = require("discord.js");
const { Collection } = require("discord.js");
const { env } = require("./config/env");
const { loadCommands } = require("./loaders/commands");
const { logger } = require("./lib/logger");
const { formatSyncResults, getDefaultScope, syncApplicationCommands } = require("./services/commandSyncService");

async function deploy(clientId) {
  const scratchClient = {
    commands: new Collection(),
    user: { id: clientId },
  };
  await loadCommands(scratchClient);

  const results = await syncApplicationCommands(scratchClient, {
    scope: getDefaultScope(),
  });

  console.log(formatSyncResults(results));
}

async function clearGlobal(clientId) {
  const rest = new REST({ version: "10" }).setToken(env.DISCORD_TOKEN);
  await rest.put(Routes.applicationCommands(clientId), { body: [] });
  logger.info({ event: "global_commands_cleared" }, "global commands cleared");
}

async function main() {
  const rest = new REST({ version: "10" }).setToken(env.DISCORD_TOKEN);
  const application = await rest.get(Routes.oauth2CurrentApplication());

  if (process.argv.includes("--clear-global")) {
    await clearGlobal(application.id);
    console.log("Comandos globais apagados.");
    return;
  }

  await deploy(application.id);
}

if (require.main === module) {
  main().catch((error) => {
    logger.error({ event: "deploy_failed", error: error.message, stack: error.stack }, "deploy failed");
    process.exit(1);
  });
}

module.exports = { clearGlobal, deploy };
