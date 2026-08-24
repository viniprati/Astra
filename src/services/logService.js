const { EmbedBuilder } = require("discord.js");

async function writeLog(db, guild, payload) {
  await db.repositories.logs.insert({
    guildId: guild.id,
    ...payload,
    createdAt: new Date(),
  });

  const config = await db.repositories.guildConfigs.findByGuildId(guild.id);
  if (!config?.logChannelId) {
    return;
  }

  const channel = await guild.channels.fetch(config.logChannelId).catch(() => null);
  if (!channel || !channel.isTextBased()) {
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle(payload.title || "Log do Astra")
    .setDescription(payload.description || "Evento registrado.")
    .setColor(payload.color || 0x5865f2)
    .setTimestamp();

  await channel.send({ embeds: [embed] }).catch(() => null);
}

module.exports = { writeLog };
