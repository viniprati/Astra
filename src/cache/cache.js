const Redis = require("ioredis");
const { env } = require("../config/env");
const { logger } = require("../lib/logger");
const { recordCache } = require("../observability/metrics");

class MemoryCache {
  constructor() {
    this.store = new Map();
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
}

class RedisCache {
  constructor(redis) {
    this.redis = redis;
  }

  async get(key) {
    const raw = await this.redis.get(key);

    if (!raw) {
      recordCache("get", "miss");
      return null;
    }

    recordCache("get", "hit");
    return JSON.parse(raw);
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
}

function createCache() {
  if (!env.REDIS_URL) {
    logger.info({ event: "cache_started", provider: "memory" }, "cache started");
    return new MemoryCache();
  }

  const redis = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 2,
    enableReadyCheck: true,
  });

  redis.on("error", (error) => {
    logger.warn({ event: "redis_error", error: error.message }, "redis error");
  });

  logger.info({ event: "cache_started", provider: "redis" }, "cache started");
  return new RedisCache(redis);
}

module.exports = { createCache };
