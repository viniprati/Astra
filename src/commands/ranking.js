const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");
const { getRanking } = require("../services/countService");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ranking")
    .setDescription("Mostra o ranking de promotores.")
    .addStringOption((option) =>
      option
        .setName("tipo")
        .setDescription("Tipo de ranking.")
        .setRequired(true)
        .addChoices(
          { name: "Semanal", value: "semanal" },
          { name: "Mensal", value: "mensal" },
          { name: "Total", value: "total" },
        ),
    ),

  async execute(interaction) {
    const type = interaction.options.getString("tipo");
    const ranking = await getRanking(interaction.client.db, interaction.guildId, type);

    const lines = await Promise.all(
      ranking.map(async (item, index) => {
        const user = await interaction.client.users.fetch(item.userId).catch(() => null);
        const name = user ? user.toString() : `\`${item.userId}\``;
        const count = type === "semanal" ? item.weeklyCount : type === "mensal" ? item.monthlyCount : item.totalCount;
        return `**${index + 1}.** ${name} - **${count || 0}** parcerias`;
      }),
    );

    const titleByType = {
      semanal: "🏆 Ranking Semanal",
      mensal: "🏆 Ranking Mensal",
      total: "🏆 Ranking Total",
    };

    const embed = new EmbedBuilder()
      .setTitle(titleByType[type])
      .setColor(0xfacc15)
      .setDescription(lines.length ? lines.join("\n") : "Ainda não há parcerias registradas nesse ranking.");

    await interaction.reply({ embeds: [embed] });
  },
};
