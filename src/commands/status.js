const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");
const { env } = require("../config/env");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("status")
    .setDescription("Mostra a saúde operacional do Astra."),

  async execute(interaction) {
    const mongoHealthy = await interaction.client.db.client
      .db("admin")
      .command({ ping: 1 })
      .then(() => true)
      .catch(() => false);

    const embed = new EmbedBuilder()
      .setTitle("📡 Status do Astra")
      .setColor(mongoHealthy ? 0x22c55e : 0xef4444)
      .addFields(
        { name: "Discord", value: interaction.client.isReady() ? "`online`" : "`instável`", inline: true },
        { name: "MongoDB", value: mongoHealthy ? "`online`" : "`offline`", inline: true },
        { name: "Servidores", value: String(interaction.client.guilds.cache.size), inline: true },
        { name: "Ambiente", value: `\`${env.NODE_ENV}\``, inline: true },
        { name: "Comandos", value: `\`${env.COMMAND_SCOPE}\``, inline: true },
        { name: "Uptime", value: `\`${Math.round(process.uptime())}s\``, inline: true },
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
