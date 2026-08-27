const Redis = require("ioredis");
const { env } = require("../config/env");
const { logger } = require("../lib/logger");
const { recordCache } = require("../observability/metrics");

class MemoryCache {
  constructor() {
    this.store = new Map();
    this.provider = "memory";
  }

  async get(key) {
    const item = this.store.get(key);

    if (!item) {
      recordCache("get", "miss");
      return null;
    }

    if (item.expiresAt && item.expiresAt <= Date.now()) {
      this.store.delete(key);
      recordCache("get", "expired");
      return null;
    }

    recordCache("get", "hit");
    return item.value;
  }

  async set(key, value, ttlSeconds = 300) {
    this.store.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
    });
    recordCache("set", "memory");
  }

  async delete(key) {
    this.store.delete(key);
    recordCache("delete", "memory");
  }

  async close() {
    this.store.clear();
  }
}

class RedisCache {
  constructor(redis) {
    this.redis = redis;
    this.provider = "redis";
  }

  async get(key) {
    const raw = await this.redis.get(key);

    if (!raw) {
      recordCache("get", "miss");
      return null;
    }

    try {
      recordCache("get", "hit");
      return JSON.parse(raw);
    } catch (error) {
      await this.delete(key);
      recordCache("get", "invalid_json");
      logger.warn({ event: "redis_cache_parse_failed", key, error: error.message }, "redis cache parse failed");
      return null;
    }
  }

  async set(key, value, ttlSeconds = 300) {
    const raw = JSON.stringify(value);

    if (ttlSeconds) {
      await this.redis.set(key, raw, "EX", ttlSeconds);
    } else {
      await this.redis.set(key, raw);
    }

    recordCache("set", "redis");
  }

  async delete(key) {
    await this.redis.del(key);
    recordCache("delete", "redis");
  }

  async close() {
    await this.redis.quit();
  }
}

function createCache() {
  if (!env.REDIS_URL) {
    const level = env.NODE_ENV === "production" ? "warn" : "info";
    logger[level]({
      event: "cache_started",
      provider: "memory",
      scalable: false,
    }, "cache started");
    return new MemoryCache();
  }

  const redis = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 2,
    enableReadyCheck: true,
    connectTimeout: env.REDIS_CONNECT_TIMEOUT_MS,
    commandTimeout: env.REDIS_COMMAND_TIMEOUT_MS,
  });

  redis.on("connect", () => {
    logger.info({ event: "redis_connect" }, "redis connect");
  });

  redis.on("ready", () => {
    logger.info({ event: "redis_ready" }, "redis ready");
  });

  redis.on("error", (error) => {
    logger.warn({ event: "redis_error", error: error.message }, "redis error");
  });

  redis.on("close", () => {
    logger.warn({ event: "redis_closed" }, "redis closed");
  });

  logger.info({ event: "cache_started", provider: "redis" }, "cache started");
  return new RedisCache(redis);
}

module.exports = { createCache };
