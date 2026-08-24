const INVITE_REGEX = /(?:https?:\/\/)?(?:www\.)?(?:discord\.gg|discord(?:app)?\.com\/invite)\/([a-z0-9-]+)/gi;
const URL_REGEX = /https?:\/\/[^\s<>()]+/gi;

function normalizeTarget(targetType, rawValue) {
  const value = String(rawValue || "").trim();

  if (targetType === "domain") {
    try {
      return new URL(value.startsWith("http") ? value : `https://${value}`).hostname.toLowerCase();
    } catch {
      return value.toLowerCase();
    }
  }

  if (targetType === "invite_link") {
    const match = [...value.matchAll(INVITE_REGEX)][0];
    return match ? match[1].toLowerCase() : value.toLowerCase();
  }

  if (targetType === "link") {
    return value.toLowerCase();
  }

  return value.replace(/[<@!&>]/g, "");
}

function getCandidatesFromText(text) {
  const value = String(text || "");
  const candidates = [];

  for (const match of value.matchAll(INVITE_REGEX)) {
    candidates.push({ targetType: "invite_link", targetValue: match[1].toLowerCase() });
  }

  for (const match of value.matchAll(URL_REGEX)) {
    const url = match[0].replace(/[),.;]+$/g, "");

    try {
      const parsed = new URL(url);
      candidates.push({ targetType: "domain", targetValue: parsed.hostname.toLowerCase() });
      candidates.push({ targetType: "link", targetValue: url.toLowerCase() });
    } catch {
      // URL_REGEX already does the heavy lifting; malformed tails can be ignored.
    }
  }

  const numericIds = value.match(/\b\d{15,25}\b/g) || [];
  for (const id of numericIds) {
    candidates.push({ targetType: "server_id", targetValue: id });
    candidates.push({ targetType: "user_id", targetValue: id });
  }

  return candidates;
}

async function addBlacklistItem(db, guildId, item) {
  const targetValue = normalizeTarget(item.targetType, item.targetValue);
  const document = {
    guildId,
    targetType: item.targetType,
    targetValue,
    reason: item.reason,
    addedBy: item.addedBy,
    createdAt: new Date(),
  };

  await db.repositories.blacklists.upsert(document);
  await db.cache?.delete(`blacklist:${guildId}`);

  return document;
}

async function removeBlacklistItem(db, guildId, targetType, rawTargetValue) {
  const targetValue = normalizeTarget(targetType, rawTargetValue);
  const result = await db.repositories.blacklists.delete(guildId, targetType, targetValue);
  await db.cache?.delete(`blacklist:${guildId}`);
  return result.deletedCount > 0;
}

async function listBlacklistItems(db, guildId, limit = 15) {
  return db.repositories.blacklists.list(guildId, limit);
}

async function findBlacklistMatch(db, guildId, text) {
  const candidates = getCandidatesFromText(text);

  if (!candidates.length) {
    return null;
  }

  const cacheKey = `blacklist:${guildId}`;
  let items = await db.cache?.get(cacheKey);

  if (!items) {
    items = await db.repositories.blacklists.list(guildId, 1000);
    await db.cache?.set(cacheKey, items, 120);
  }

  return items.find((item) =>
    candidates.some((candidate) =>
      candidate.targetType === item.targetType && candidate.targetValue === item.targetValue,
    ),
  ) || null;
}

async function checkBlacklistValue(db, guildId, targetType, rawTargetValue) {
  return db.repositories.blacklists.findOne({
    guildId,
    targetType,
    targetValue: normalizeTarget(targetType, rawTargetValue),
  });
}

module.exports = {
  addBlacklistItem,
  checkBlacklistValue,
  findBlacklistMatch,
  listBlacklistItems,
  normalizeTarget,
  removeBlacklistItem,
};
