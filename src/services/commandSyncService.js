const { REST, Routes } = require("discord.js");
const { env } = require("../config/env");
const { logger } = require("../lib/logger");

function getCommandPayloads(client) {
  return client.commands.map((command) => command.data.toJSON());
}

function getDefaultScope() {
  if (env.COMMAND_SCOPE === "global") {
    return "global";
  }

  if (env.COMMAND_SCOPE === "all") {
    return "all";
  }

  if (env.COMMAND_SCOPE === "reset_guild") {
    return "reset_guild";
  }

  return "guild";
}

function getInteractiveDefaultScope() {
  return env.COMMAND_SCOPE === "global" ? "reset_global" : getDefaultScope();
}

async function putCommands(rest, applicationId, routeName, guildId, body) {
  const route =
    routeName === "guild"
      ? Routes.applicationGuildCommands(applicationId, guildId)
      : Routes.applicationCommands(applicationId);

  await rest.put(route, { body });
}

async function syncApplicationCommands(client, options = {}) {
  const scope = options.scope || getDefaultScope();
  const guildId = options.guildId || env.DEV_GUILD_ID;
  const rest = new REST({ version: "10" }).setToken(env.DISCORD_TOKEN);
  const applicationId = client.user.id;
  const body = getCommandPayloads(client);
  const results = [];

  if (scope === "clear_global") {
    await putCommands(rest, applicationId, "global", null, []);
    logger.info({ event: "commands_cleared", scope: "global" }, "commands cleared");
    return [{ scope: "global", count: 0, action: "cleared" }];
  }

  if (scope === "clear_guild") {
    if (!guildId) {
      throw new Error("Nenhum servidor foi encontrado para limpar comandos locais.");
    }

    await putCommands(rest, applicationId, "guild", guildId, []);
    logger.info({ event: "commands_cleared", scope: "guild", guildId }, "commands cleared");
    return [{ scope: "guild", guildId, count: 0, action: "cleared" }];
  }

  if (scope === "reset_global") {
    if (!guildId) {
      throw new Error("Nenhum servidor foi encontrado para limpar comandos locais.");
    }

    await putCommands(rest, applicationId, "guild", guildId, []);
    results.push({ scope: "guild", guildId, count: 0, action: "cleared" });

    await putCommands(rest, applicationId, "global", null, body);
    results.push({ scope: "global", count: body.length, action: "synced" });

    logger.info({ event: "commands_synced", scope, guildId, count: body.length }, "commands synced");
    return results;
  }

  if (scope === "reset_guild") {
    if (!guildId) {
      throw new Error("Nenhum servidor foi encontrado para sincronizar comandos locais.");
    }

    await putCommands(rest, applicationId, "global", null, []);
    results.push({ scope: "global", count: 0, action: "cleared" });

    await putCommands(rest, applicationId, "guild", guildId, body);
    results.push({ scope: "guild", guildId, count: body.length, action: "synced" });

    logger.info({ event: "commands_synced", scope, guildId, count: body.length }, "commands synced");
    return results;
  }

  if (scope === "global" || scope === "all") {
    await putCommands(rest, applicationId, "global", null, body);
    results.push({ scope: "global", count: body.length, action: "synced" });
  }

  if (scope === "guild" || scope === "all") {
    if (!guildId) {
      throw new Error("Nenhum servidor foi encontrado para sincronizar comandos locais.");
    }

    await putCommands(rest, applicationId, "guild", guildId, body);
    results.push({ scope: "guild", guildId, count: body.length, action: "synced" });
  }

  logger.info({ event: "commands_synced", scope, guildId, count: body.length, results }, "commands synced");
  return results;
}

function formatSyncResults(results) {
  return results
    .map((result) => {
      if (result.action === "cleared") {
        if (result.scope === "guild") {
          return `Servidor ${result.guildId}: comandos apagados.`;
        }

        return "Global: comandos apagados.";
      }

      if (result.scope === "guild") {
        return `Servidor ${result.guildId}: ${result.count} comandos sincronizados.`;
      }

      return `Global: ${result.count} comandos sincronizados.`;
    })
    .join("\n");
}

module.exports = {
  formatSyncResults,
  getDefaultScope,
  getInteractiveDefaultScope,
  syncApplicationCommands,
};
