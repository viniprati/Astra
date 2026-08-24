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

registry.registerMetric(commandDuration);
registry.registerMetric(commandTotal);
registry.registerMetric(partnershipTotal);
registry.registerMetric(blacklistChecksTotal);
registry.registerMetric(cacheTotal);

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

module.exports = {
  observeCommand,
  recordBlacklistCheck,
  recordCache,
  recordPartnership,
  registry,
};
