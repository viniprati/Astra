const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");
const { getUserCount, resetCounts } = require("../services/countService");
const { getGuildConfig } = require("../services/guildConfigService");
const { hasAdminPermission } = require("../lib/permissions");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("contador")
    .setDescription("Consulta ou reseta contagens de parcerias.")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("ver")
        .setDescription("Mostra a contagem de um usuário.")
        .addUserOption((option) => option.setName("usuario").setDescription("Usuário consultado.")),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("reset")
        .setDescription("Reseta contagens do servidor.")
        .addStringOption((option) =>
          option
            .setName("tipo")
            .setDescription("Tipo de reset.")
            .setRequired(true)
            .addChoices(
              { name: "Semanal", value: "semanal" },
              { name: "Mensal", value: "mensal" },
              { name: "Total", value: "total" },
            ),
        ),
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "ver") {
      const user = interaction.options.getUser("usuario") || interaction.user;
      const count = await getUserCount(interaction.client.db, interaction.guildId, user.id);

      const embed = new EmbedBuilder()
        .setTitle("📊 Contador de Parcerias")
        .setColor(0x5865f2)
        .setThumbnail(user.displayAvatarURL({ size: 128 }))
        .addFields(
          { name: "Usuário", value: user.toString(), inline: false },
          { name: "Semanal", value: String(count?.weeklyCount || 0), inline: true },
          { name: "Mensal", value: String(count?.monthlyCount || 0), inline: true },
          { name: "Total", value: String(count?.totalCount || 0), inline: true },
        );

      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    const config = await getGuildConfig(interaction.client.db, interaction.guildId);
    if (!hasAdminPermission(interaction.member, config)) {
      await interaction.reply({ content: "Você não tem permissão para resetar contadores.", ephemeral: true });
      return;
    }

    const type = interaction.options.getString("tipo");
    const modified = await resetCounts(interaction.client.db, interaction.guildId, type);

    await interaction.reply({
      content: `Reset \`${type}\` aplicado em ${modified} registro(s).`,
      ephemeral: true,
    });
  },
};
