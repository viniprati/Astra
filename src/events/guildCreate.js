const { Events } = require("discord.js");
const { logger } = require("../lib/logger");
const { setRuntimeMetrics } = require("../observability/metrics");
const { trackGuild } = require("../analytics/posthog");

module.exports = {
  name: Events.GuildCreate,

  async execute(guild) {
    logger.info({
      event: "guild_joined",
      guildId: guild.id,
      guildName: guild.name,
      memberCount: guild.memberCount,
    }, "guild joined");
    trackGuild(guild, "guild_joined");
    setRuntimeMetrics(guild.client);
  },
};
