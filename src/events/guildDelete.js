const { Events } = require("discord.js");
const { logger } = require("../lib/logger");

module.exports = {
  name: Events.GuildDelete,

  async execute(guild) {
    logger.info({
      event: "guild_left",
      guildId: guild.id,
      guildName: guild.name,
    }, "guild left");
  },
};
