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

function boolean(name, defaultValue) {
  const value = process.env[name];

  if (value === undefined) {
    return defaultValue;
  }

  return !["0", "false", "no", "off"].includes(value.toLowerCase());
}

function number(name, defaultValue, options = {}) {
  const raw = process.env[name];
  const value = raw === undefined ? defaultValue : Number(raw);

  if (!Number.isFinite(value)) {
    throw new Error(`Variavel de ambiente invalida: ${name}`);
  }

  if (options.min !== undefined && value < options.min) {
    throw new Error(`Variavel de ambiente ${name} deve ser >= ${options.min}`);
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
  AUTO_DEPLOY_COMMANDS: boolean("AUTO_DEPLOY_COMMANDS", true),
  REDIS_URL: process.env.REDIS_URL || null,
  HEALTH_HOST: process.env.HEALTH_HOST || "0.0.0.0",
  HEALTH_PORT: number("HEALTH_PORT", 0, { min: 0 }),
  METRICS_ENABLED: boolean("METRICS_ENABLED", true),
  SCHEDULER_ENABLED: boolean("SCHEDULER_ENABLED", true),
  MESSAGE_CONTENT_INTENT: boolean("MESSAGE_CONTENT_INTENT", true),
  MONGO_CONNECT_TIMEOUT_MS: number("MONGO_CONNECT_TIMEOUT_MS", 10000, { min: 1000 }),
  MONGO_SERVER_SELECTION_TIMEOUT_MS: number("MONGO_SERVER_SELECTION_TIMEOUT_MS", 10000, { min: 1000 }),
  MONGO_MAX_POOL_SIZE: number("MONGO_MAX_POOL_SIZE", 20, { min: 1 }),
  MONGO_MIN_POOL_SIZE: number("MONGO_MIN_POOL_SIZE", 0, { min: 0 }),
  COMMAND_USAGE_TTL_DAYS: number("COMMAND_USAGE_TTL_DAYS", 90, { min: 1 }),
  REDIS_CONNECT_TIMEOUT_MS: number("REDIS_CONNECT_TIMEOUT_MS", 10000, { min: 1000 }),
  REDIS_COMMAND_TIMEOUT_MS: number("REDIS_COMMAND_TIMEOUT_MS", 5000, { min: 500 }),
  SHARD_TOTAL: process.env.SHARD_TOTAL || "auto",
  SHARD_RESPAWN: boolean("SHARD_RESPAWN", true),
  LOG_LEVEL: process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug"),
};

module.exports = { env };
