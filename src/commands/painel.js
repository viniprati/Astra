const { SlashCommandBuilder } = require("discord.js");
const { getGuildConfig } = require("../services/guildConfigService");
const { hasAdminPermission } = require("../lib/permissions");
const { buildPanelEmbed, buildPanelRows } = require("../ui/panel");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("painel")
    .setDescription("Abre o painel administrativo do Astra."),

  async execute(interaction) {
    const config = await getGuildConfig(interaction.client.db, interaction.guildId);

    if (!hasAdminPermission(interaction.member, config)) {
      await interaction.reply({
        content: "Você não tem permissão para abrir o painel.",
        ephemeral: true,
      });
      return;
    }

    await interaction.reply({
      embeds: [buildPanelEmbed(config)],
      components: buildPanelRows(),
      ephemeral: true,
    });
  },
};
