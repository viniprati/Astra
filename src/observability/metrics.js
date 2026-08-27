const client = require("prom-client");
const { env } = require("../config/env");

const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry, prefix: "astra_" });

const commandDuration = new client.Histogram({
  name: "astra_command_duration_seconds",
  help: "Discord interaction command duration.",
  labelNames: ["command", "status"],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

const commandTotal = new client.Counter({
  name: "astra_command_total",
  help: "Discord command executions.",
  labelNames: ["command", "status"],
});

const interactionDuration = new client.Histogram({
  name: "astra_interaction_duration_seconds",
  help: "Discord interaction handling duration.",
  labelNames: ["kind", "status"],
  buckets: [0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

const interactionTotal = new client.Counter({
  name: "astra_interaction_total",
  help: "Discord interactions handled by this process.",
  labelNames: ["kind", "status"],
});

const httpRequestDuration = new client.Histogram({
  name: "astra_http_request_duration_seconds",
  help: "HTTP endpoint request duration.",
  labelNames: ["route", "status_class"],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
});

const httpRequestTotal = new client.Counter({
  name: "astra_http_request_total",
  help: "HTTP endpoint requests.",
  labelNames: ["route", "status_class"],
});

const partnershipTotal = new client.Counter({
  name: "astra_partnership_total",
  help: "Partnership workflow outcomes.",
  labelNames: ["status"],
});

const blacklistChecksTotal = new client.Counter({
  name: "astra_blacklist_checks_total",
  help: "Blacklist checks by outcome.",
  labelNames: ["status"],
});

const cacheTotal = new client.Counter({
  name: "astra_cache_total",
  help: "Cache operations by outcome.",
  labelNames: ["operation", "status"],
});

const runtimeInfo = new client.Gauge({
  name: "astra_runtime_info",
  help: "Runtime metadata for this bot process.",
  labelNames: ["node_env", "cache_provider", "shard_id"],
});

const discordReady = new client.Gauge({
  name: "astra_discord_ready",
  help: "Whether the Discord client is ready.",
});

const guildCount = new client.Gauge({
  name: "astra_guild_count",
  help: "Number of guilds visible to this process.",
});

const cachedUserCount = new client.Gauge({
  name: "astra_cached_user_count",
  help: "Number of Discord users cached in this process.",
});

const cachedChannelCount = new client.Gauge({
  name: "astra_cached_channel_count",
  help: "Number of Discord channels cached in this process.",
});

const commandDefinitionCount = new client.Gauge({
  name: "astra_command_definition_count",
  help: "Number of slash commands loaded in this process.",
});

const discordWsPing = new client.Gauge({
  name: "astra_discord_ws_ping_ms",
  help: "Discord websocket ping in milliseconds.",
});

const mongoPingDuration = new client.Histogram({
  name: "astra_mongo_ping_duration_seconds",
  help: "MongoDB ping duration from health checks.",
  labelNames: ["status"],
  buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
});

registry.registerMetric(commandDuration);
registry.registerMetric(commandTotal);
registry.registerMetric(interactionDuration);
registry.registerMetric(interactionTotal);
registry.registerMetric(httpRequestDuration);
registry.registerMetric(httpRequestTotal);
registry.registerMetric(partnershipTotal);
registry.registerMetric(blacklistChecksTotal);
registry.registerMetric(cacheTotal);
registry.registerMetric(runtimeInfo);
registry.registerMetric(discordReady);
registry.registerMetric(guildCount);
registry.registerMetric(cachedUserCount);
registry.registerMetric(cachedChannelCount);
registry.registerMetric(commandDefinitionCount);
registry.registerMetric(discordWsPing);
registry.registerMetric(mongoPingDuration);

function getInteractionKind(interaction) {
  if (interaction.isChatInputCommand?.()) {
    return "chat_input_command";
  }

  if (interaction.isButton?.()) {
    return "button";
  }

  if (interaction.isStringSelectMenu?.()) {
    return "string_select";
  }

  if (interaction.isChannelSelectMenu?.()) {
    return "channel_select";
  }

  if (interaction.isRoleSelectMenu?.()) {
    return "role_select";
  }

  if (interaction.isModalSubmit?.()) {
    return "modal_submit";
  }

  return "unknown";
}

function observeCommand(command, status, startedAt) {
  if (!env.METRICS_ENABLED) {
    return;
  }

  const duration = (Date.now() - startedAt) / 1000;
  commandTotal.inc({ command, status });
  commandDuration.observe({ command, status }, duration);
}

function recordPartnership(status) {
  if (env.METRICS_ENABLED) {
    partnershipTotal.inc({ status });
  }
}

function recordBlacklistCheck(status) {
  if (env.METRICS_ENABLED) {
    blacklistChecksTotal.inc({ status });
  }
}

function recordCache(operation, status) {
  if (env.METRICS_ENABLED) {
    cacheTotal.inc({ operation, status });
  }
}

function observeInteraction(interaction, status, startedAt) {
  if (!env.METRICS_ENABLED) {
    return;
  }

  const kind = getInteractionKind(interaction);
  interactionTotal.inc({ kind, status });
  interactionDuration.observe({ kind, status }, (Date.now() - startedAt) / 1000);
}

function observeHttpRequest(route, statusCode, startedAt) {
  if (!env.METRICS_ENABLED) {
    return;
  }

  const statusClass = `${Math.floor(statusCode / 100)}xx`;
  httpRequestTotal.inc({ route, status_class: statusClass });
  httpRequestDuration.observe({ route, status_class: statusClass }, (Date.now() - startedAt) / 1000);
}

function observeMongoPing(status, startedAt) {
  if (!env.METRICS_ENABLED) {
    return;
  }

  mongoPingDuration.observe({ status }, (Date.now() - startedAt) / 1000);
}

function setRuntimeMetrics(client) {
  if (!env.METRICS_ENABLED) {
    return;
  }

  runtimeInfo.set({
    node_env: env.NODE_ENV,
    cache_provider: client.cache?.provider || "unknown",
    shard_id: client.shard?.ids?.join(",") || process.env.SHARD_ID || "single",
  }, 1);
  discordReady.set(client.isReady() ? 1 : 0);
  guildCount.set(client.guilds.cache.size);
  cachedUserCount.set(client.users.cache.size);
  cachedChannelCount.set(client.channels.cache.size);
  commandDefinitionCount.set(client.commands?.size || 0);
  discordWsPing.set(Math.max(0, client.ws?.ping || 0));
}

module.exports = {
  observeCommand,
  observeHttpRequest,
  observeInteraction,
  observeMongoPing,
  recordBlacklistCheck,
  recordCache,
  recordPartnership,
  registry,
  setRuntimeMetrics,
};
