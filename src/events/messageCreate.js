const { Events } = require("discord.js");
const { isBotOwner } = require("../lib/owner");
const { getInteractiveDefaultScope, syncApplicationCommands } = require("../services/commandSyncService");
const { messageLogger } = require("../lib/logger");

const SCOPE_ALIASES = {
  servidor: "guild",
  guild: "guild",
  local: "guild",
  global: "global",
  globais: "global",
  all: "all",
  tudo: "all",
  todos: "all",
  reset: "reset_guild",
  recomendado: "reset_guild",
  fix: "reset_guild",
  resetglobal: "reset_global",
  "reset-global": "reset_global",
  reset_global: "reset_global",
  limpar: "clear_global",
  limparservidor: "clear_guild",
  "limpar-servidor": "clear_guild",
  clear_guild: "clear_guild",
  "clear-global": "clear_global",
  clear_global: "clear_global",
};

module.exports = {
  name: Events.MessageCreate,

  async execute(message, client) {
    if (!message.guild || message.author.bot) {
      return;
    }

    const [rawCommand, rawScope] = message.content.trim().split(/\s+/);
    if (rawCommand?.toLowerCase() !== "!sync") {
      return;
    }

    const log = messageLogger(message);
    if (!await isBotOwner(client, message.author.id)) {
      await message.delete().catch(() => null);
      return;
    }

    const scope = rawScope ? SCOPE_ALIASES[rawScope.toLowerCase()] || getInteractiveDefaultScope() : getInteractiveDefaultScope();
    const status = await message.reply("Sincronizando...");

    try {
      await syncApplicationCommands(client, {
        scope,
        guildId: message.guild.id,
      });

      await status.edit("✅ Sync concluído.");
      setTimeout(() => {
        status.delete().catch(() => null);
        message.delete().catch(() => null);
      }, 8000);
    } catch (error) {
      log.error({ event: "prefix_sync_failed", error: error.message, stack: error.stack }, "prefix sync failed");
      await status.edit("❌ Não consegui sincronizar.");
    }
  },
};
