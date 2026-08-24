const { Events } = require("discord.js");
const { logger } = require("../lib/logger");

module.exports = {
  name: Events.GuildCreate,

  async execute(guild) {
    logger.info({
      event: "guild_joined",
      guildId: guild.id,
      guildName: guild.name,
      memberCount: guild.memberCount,
    }, "guild joined");
  },
};
