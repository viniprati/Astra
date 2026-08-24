const COMMAND_COOLDOWNS = {
  embed: 30,
  sync: 60,
  blacklist: 5,
  config: 5,
  contador: 5,
  ranking: 5,
  painel: 10,
  ajuda: 3,
  status: 10,
};

async function checkCommandCooldown(cache, guildId, userId, commandName) {
  const ttlSeconds = COMMAND_COOLDOWNS[commandName] || 5;
  const key = `cooldown:${guildId}:${userId}:${commandName}`;
  const existing = await cache.get(key);

  if (existing) {
    return {
      limited: true,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.expiresAt - Date.now()) / 1000)),
    };
  }

  await cache.set(key, { expiresAt: Date.now() + ttlSeconds * 1000 }, ttlSeconds);
  return { limited: false, retryAfterSeconds: 0 };
}

module.exports = { checkCommandCooldown };
