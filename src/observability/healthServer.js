const http = require("node:http");
const { env } = require("../config/env");
const { logger } = require("../lib/logger");
const { observeHttpRequest, observeMongoPing, registry, setRuntimeMetrics } = require("./metrics");

function getShardAwareHealthPort(client) {
  if (!env.HEALTH_PORT) {
    return 0;
  }

  const shardId = client.shard?.ids?.[0] ?? Number(process.env.SHARD_ID || 0);
  return env.HEALTH_PORT + shardId;
}

async function getMongoHealth(client) {
  const startedAt = Date.now();

  try {
    await client.db.client.db("admin").command({ ping: 1 });
    observeMongoPing("success", startedAt);
    return { healthy: true, durationMs: Date.now() - startedAt };
  } catch (error) {
    observeMongoPing("error", startedAt);
    return { healthy: false, durationMs: Date.now() - startedAt, error: error.message };
  }
}

function startHealthServer(client) {
  const port = getShardAwareHealthPort(client);

  if (!port) {
    return null;
  }

  const server = http.createServer(async (req, res) => {
    const startedAt = Date.now();
    const path = new URL(req.url, `http://${req.headers.host || "localhost"}`).pathname;

    if (path === "/livez") {
      const statusCode = 200;
      observeHttpRequest("/livez", statusCode, startedAt);
      res.writeHead(statusCode, { "content-type": "application/json" });
      res.end(JSON.stringify({
        ok: true,
        uptimeSeconds: Math.round(process.uptime()),
      }));
      return;
    }

    if (path === "/healthz" || path === "/readyz") {
      const mongo = await getMongoHealth(client);
      const discordReady = client.isReady();
      const healthy = mongo.healthy && discordReady;
      const statusCode = healthy ? 200 : 503;
      setRuntimeMetrics(client);

      observeHttpRequest(path === "/readyz" ? "/readyz" : "/healthz", statusCode, startedAt);
      res.writeHead(statusCode, { "content-type": "application/json" });
      res.end(JSON.stringify({
        ok: healthy,
        discordReady,
        mongoHealthy: mongo.healthy,
        mongoPingMs: mongo.durationMs,
        guildCount: client.guilds.cache.size,
        shardIds: client.shard?.ids || null,
        cacheProvider: client.cache?.provider || "unknown",
        uptimeSeconds: Math.round(process.uptime()),
      }));
      return;
    }

    if (path === "/metrics") {
      setRuntimeMetrics(client);
      const statusCode = 200;
      observeHttpRequest("/metrics", statusCode, startedAt);
      res.writeHead(statusCode, { "content-type": registry.contentType });
      res.end(await registry.metrics());
      return;
    }

    const statusCode = 404;
    observeHttpRequest("/not_found", statusCode, startedAt);
    res.writeHead(statusCode, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: "not_found" }));
  });

  server.listen(port, env.HEALTH_HOST, () => {
    logger.info({
      event: "health_server_started",
      host: env.HEALTH_HOST,
      port,
      basePort: env.HEALTH_PORT,
    }, "health server started");
  });

  return server;
}

module.exports = { startHealthServer };
