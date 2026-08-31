const crypto = require("node:crypto");
const { env } = require("../config/env");
const { logger } = require("../lib/logger");

function isEnabled() {
  return Boolean(env.POSTHOG_ENABLED && env.POSTHOG_KEY);
}

function getSalt() {
  return env.POSTHOG_SALT || env.DISCORD_TOKEN.slice(0, 32);
}

function hashId(value) {
  if (!value) {
    return null;
  }

  return crypto
    .createHmac("sha256", getSalt())
    .update(String(value))
    .digest("hex")
    .slice(0, 24);
}

function publicInteractionProperties(interaction, extra = {}) {
  return {
    guild_hash: hashId(interaction.guildId),
    user_hash: hashId(interaction.user?.id),
    channel_hash: hashId(interaction.channelId),
    environment: env.NODE_ENV,
    shard_id: interaction.client.shard?.ids?.join(",") || process.env.SHARD_ID || "single",
    cache_provider: interaction.client.cache?.provider || "unknown",
    $process_person_profile: false,
    ...extra,
  };
}

function publicGuildProperties(guild, extra = {}) {
  return {
    guild_hash: hashId(guild.id),
    member_count_bucket: bucketNumber(guild.memberCount || 0),
    environment: env.NODE_ENV,
    shard_id: guild.client.shard?.ids?.join(",") || process.env.SHARD_ID || "single",
    $process_person_profile: false,
    ...extra,
  };
}

function bucketNumber(value) {
  if (value < 100) {
    return "0-99";
  }

  if (value < 1000) {
    return "100-999";
  }

  if (value < 10000) {
    return "1k-9k";
  }

  return "10k+";
}

async function send(event, distinctId, properties) {
  if (!isEnabled()) {
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.POSTHOG_TIMEOUT_MS);

  try {
    const response = await fetch(`${env.POSTHOG_HOST}/capture/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: env.POSTHOG_KEY,
        event,
        distinct_id: distinctId || "astra-server",
        properties,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      logger.warn({
        event: "posthog_capture_failed",
        statusCode: response.status,
        analyticsEvent: event,
      }, "posthog capture failed");
    }
  } catch (error) {
    logger.warn({
      event: "posthog_capture_error",
      analyticsEvent: event,
      error: error.message,
    }, "posthog capture error");
  } finally {
    clearTimeout(timeout);
  }
}

function trackEvent(event, distinctId, properties = {}) {
  if (!isEnabled()) {
    return Promise.resolve();
  }

  return send(event, distinctId, properties).catch(() => null);
}

function trackInteraction(interaction, event, extra = {}) {
  trackEvent(event, hashId(interaction.user?.id), publicInteractionProperties(interaction, extra));
}

function trackGuild(guild, event, extra = {}) {
  trackEvent(event, hashId(guild.id), publicGuildProperties(guild, extra));
}

module.exports = {
  hashId,
  isEnabled,
  publicInteractionProperties,
  trackEvent,
  trackGuild,
  trackInteraction,
};
