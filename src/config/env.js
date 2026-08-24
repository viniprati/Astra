const path = require("node:path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

function defaultCommandScope() {
  const hasDevGuild = Boolean(process.env.DEV_GUILD_ID || process.env.GUILD_ID);
  return process.env.NODE_ENV === "production" || !hasDevGuild ? "global" : "guild";
}

function required(name, fallbackName) {
  const value = process.env[name] || (fallbackName ? process.env[fallbackName] : undefined);

  if (!value) {
    throw new Error(`Variavel de ambiente obrigatoria ausente: ${name}`);
  }

  return value;
}

const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  DISCORD_TOKEN: required("DISCORD_TOKEN"),
  MONGO_URI: required("MONGO_URI", "MONGO_TOKEN"),
  BOT_OWNER_IDS: (process.env.BOT_OWNER_IDS || process.env.BOT_OWNER_ID || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean),
  DATABASE_NAME: process.env.DATABASE_NAME || "astra",
  DEV_GUILD_ID: process.env.DEV_GUILD_ID || process.env.GUILD_ID || null,
  COMMAND_SCOPE: process.env.COMMAND_SCOPE || defaultCommandScope(),
  AUTO_DEPLOY_COMMANDS: process.env.AUTO_DEPLOY_COMMANDS !== "false",
  REDIS_URL: process.env.REDIS_URL || null,
  HEALTH_PORT: Number(process.env.HEALTH_PORT || 0),
  METRICS_ENABLED: process.env.METRICS_ENABLED !== "false",
  SCHEDULER_ENABLED: process.env.SCHEDULER_ENABLED !== "false",
  LOG_LEVEL: process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug"),
};

module.exports = { env };
