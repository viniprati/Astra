function getWeekKey(date = new Date()) {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNumber = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil(((target - yearStart) / 86400000 + 1) / 7);
  return `${target.getUTCFullYear()}-W${String(weekNumber).padStart(2, "0")}`;
}

function getMonthKey(date = new Date()) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

async function incrementPartnershipCount(db, guildId, userId) {
  const now = new Date();
  const weekKey = getWeekKey(now);
  const monthKey = getMonthKey(now);
  const current = await db.repositories.counts.findByUser(guildId, userId);

  const resetPatch = {};

  if (!current || current.weekKey !== weekKey) {
    resetPatch.weeklyCount = 0;
    resetPatch.weekKey = weekKey;
  }

  if (!current || current.monthKey !== monthKey) {
    resetPatch.monthlyCount = 0;
    resetPatch.monthKey = monthKey;
  }

  await db.repositories.counts.updateOne(
    { guildId, userId },
    {
      $set: {
        ...resetPatch,
        lastPartnerAt: now,
        updatedAt: now,
      },
      $setOnInsert: {
        guildId,
        userId,
        totalCount: 0,
        createdAt: now,
      },
    },
    { upsert: true },
  );

  await db.repositories.counts.updateOne(
    { guildId, userId },
    {
      $inc: {
        weeklyCount: 1,
        monthlyCount: 1,
        totalCount: 1,
      },
      $set: {
        weekKey,
        monthKey,
        lastPartnerAt: now,
        updatedAt: now,
      },
    },
  );

  return db.repositories.counts.findByUser(guildId, userId);
}

async function getUserCount(db, guildId, userId) {
  return db.repositories.counts.findByUser(guildId, userId);
}

async function getRanking(db, guildId, type, limit = 10) {
  const fieldByType = {
    semanal: "weeklyCount",
    mensal: "monthlyCount",
    total: "totalCount",
  };
  const field = fieldByType[type] || "weeklyCount";

  return db.repositories.counts.ranking(guildId, field, limit);
}

async function resetCounts(db, guildId, type) {
  const patchByType = {
    semanal: { weeklyCount: 0, weekKey: getWeekKey() },
    mensal: { monthlyCount: 0, monthKey: getMonthKey() },
    total: { weeklyCount: 0, monthlyCount: 0, totalCount: 0, weekKey: getWeekKey(), monthKey: getMonthKey() },
  };

  const result = await db.repositories.counts.reset(guildId, patchByType[type]);

  return result.modifiedCount;
}

module.exports = {
  getMonthKey,
  getRanking,
  getUserCount,
  getWeekKey,
  incrementPartnershipCount,
  resetCounts,
};
