const http = require("node:http");
const { env } = require("../config/env");
const { logger } = require("../lib/logger");
const { registry } = require("./metrics");

function startHealthServer(client) {
  if (!env.HEALTH_PORT) {
    return null;
  }

  const server = http.createServer(async (req, res) => {
    if (req.url === "/healthz") {
      const mongoHealthy = await client.db.client.db("admin").command({ ping: 1 }).then(() => true).catch(() => false);
      const discordReady = client.isReady();
      const healthy = mongoHealthy && discordReady;

      res.writeHead(healthy ? 200 : 503, { "content-type": "application/json" });
      res.end(JSON.stringify({
        ok: healthy,
        discordReady,
        mongoHealthy,
        uptimeSeconds: Math.round(process.uptime()),
      }));
      return;
    }

    if (req.url === "/metrics") {
      res.writeHead(200, { "content-type": registry.contentType });
      res.end(await registry.metrics());
      return;
    }

    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: "not_found" }));
  });

  server.listen(env.HEALTH_PORT, () => {
    logger.info({ event: "health_server_started", port: env.HEALTH_PORT }, "health server started");
  });

  return server;
}

module.exports = { startHealthServer };
