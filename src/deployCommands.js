const { REST, Routes } = require("discord.js");
const { Client, Collection, GatewayIntentBits } = require("discord.js");
const { env } = require("./config/env");
const { loadCommands, getCommandPayloads } = require("./loaders/commands");
const { logger } = require("./lib/logger");

async function deploy(clientId) {
  const scratchClient = new Client({ intents: [GatewayIntentBits.Guilds] });
  scratchClient.commands = new Collection();
  await loadCommands(scratchClient);

  const rest = new REST({ version: "10" }).setToken(env.DISCORD_TOKEN);
  const body = getCommandPayloads(scratchClient);
  const isGlobal = env.COMMAND_SCOPE === "global";
  const guildId = env.DEV_GUILD_ID;

  if (!isGlobal && !guildId) {
    throw new Error("DEV_GUILD_ID/GUILD_ID e obrigatorio quando COMMAND_SCOPE nao e global.");
  }

  const route = isGlobal
    ? Routes.applicationCommands(clientId)
    : Routes.applicationGuildCommands(clientId, guildId);

  await rest.put(route, { body });
  logger.info({
    event: "commands_deployed",
    scope: isGlobal ? "global" : "guild",
    guildId: isGlobal ? null : guildId,
    count: body.length,
  }, "commands deployed");

  console.log(`Registrados ${body.length} comandos ${isGlobal ? "globalmente" : `no servidor ${guildId}`}.`);
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
