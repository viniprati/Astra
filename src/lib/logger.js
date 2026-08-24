const pino = require("pino");
const { env } = require("../config/env");

const logger = pino({
  level: env.LOG_LEVEL,
  base: {
    service: "astra-discord-bot",
    env: env.NODE_ENV,
  },
  redact: {
    paths: [
      "DISCORD_TOKEN",
      "MONGO_URI",
      "MONGO_TOKEN",
      "token",
      "*.token",
      "authorization",
      "*.authorization",
    ],
    censor: "[redacted]",
  },
});

function interactionLogger(interaction) {
  return logger.child({
    requestId: interaction.id,
    guildId: interaction.guildId,
    channelId: interaction.channelId,
    userId: interaction.user?.id,
    interactionType: interaction.type,
  });
}

function messageLogger(message) {
  return logger.child({
    requestId: message.id,
    guildId: message.guild?.id,
    channelId: message.channelId,
    userId: message.author?.id,
  });
}

module.exports = {
  interactionLogger,
  logger,
  messageLogger,
};
