const DEFAULT_COLOR = "#facc15";

function defaultConfig(guildId) {
  return {
    guildId,
    partnerChannelId: null,
    logChannelId: null,
    adminRoleId: null,
    promoterRoleId: null,
    pingRoleId: null,
    autoPing: false,
    embedColor: DEFAULT_COLOR,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

async function getGuildConfig(db, guildId) {
  const cacheKey = `guild_config:${guildId}`;
  const cached = await db.cache?.get(cacheKey);

  if (cached) {
    return cached;
  }

  const existing = await db.repositories.guildConfigs.findByGuildId(guildId);

  if (existing) {
    await db.cache?.set(cacheKey, existing, 300);
    return existing;
  }

  const config = defaultConfig(guildId);
  await db.repositories.guildConfigs.upsert(guildId, config);
  await db.cache?.set(cacheKey, config, 300);
  return config;
}

async function updateGuildConfig(db, guildId, patch) {
  const updated = await db.repositories.guildConfigs.upsert(guildId, {
    ...patch,
    updatedAt: new Date(),
  });

  await db.cache?.set(`guild_config:${guildId}`, updated, 300);
  return updated;
}

function colorToNumber(color) {
  const normalized = color?.replace("#", "");

  if (!normalized || !/^[0-9a-f]{6}$/i.test(normalized)) {
    return 0xfacc15;
  }

  return Number.parseInt(normalized, 16);
}

module.exports = {
  DEFAULT_COLOR,
  colorToNumber,
  getGuildConfig,
  updateGuildConfig,
};
