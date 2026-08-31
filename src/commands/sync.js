const { SlashCommandBuilder } = require("discord.js");
const { isBotOwner } = require("../lib/owner");
const { formatSyncResults, getInteractiveDefaultScope, syncApplicationCommands } = require("../services/commandSyncService");
const { trackInteraction } = require("../analytics/posthog");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("sync")
    .setDescription("Sincroniza os comandos do bot."),

  async execute(interaction) {
    if (!await isBotOwner(interaction.client, interaction.user.id)) {
      await interaction.reply({ content: "Apenas o dono do bot pode usar isso.", ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    const results = await syncApplicationCommands(interaction.client, {
      scope: getInteractiveDefaultScope(),
      guildId: interaction.guildId,
    });
    trackInteraction(interaction, "sync_completed", {
      result_count: results.length,
      scope: getInteractiveDefaultScope(),
    });

    await interaction.editReply(`✅ Sync concluído.\n${formatSyncResults(results)}`);
  },
};
