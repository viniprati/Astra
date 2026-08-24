const { SlashCommandBuilder } = require("discord.js");
const { buildHelpEmbed, buildHelpSelect } = require("../ui/help");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ajuda")
    .setDescription("Mostra a central de ajuda do Astra.")
    .addBooleanOption((option) =>
      option
        .setName("publico")
        .setDescription("Envia a ajuda para todos verem. Por padrão, só você vê."),
    ),

  async execute(interaction) {
    const publico = interaction.options.getBoolean("publico") || false;

    await interaction.reply({
      embeds: [buildHelpEmbed(interaction.client)],
      components: [buildHelpSelect()],
      ephemeral: !publico,
    });
  },
};
