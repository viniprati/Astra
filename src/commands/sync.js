const { SlashCommandBuilder } = require("discord.js");
const { isBotOwner } = require("../lib/owner");
const { getInteractiveDefaultScope, syncApplicationCommands } = require("../services/commandSyncService");

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

    await syncApplicationCommands(interaction.client, {
      scope: getInteractiveDefaultScope(),
      guildId: interaction.guildId,
    });

    await interaction.editReply("✅ Sync concluído.");
  },
};
