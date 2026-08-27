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

  await db.repositories.counts.updateOne(
    { guildId, userId },
    [
      {
        $set: {
          guildId,
          userId,
          createdAt: { $ifNull: ["$createdAt", now] },
          weeklyCount: {
            $add: [
              {
                $cond: [
                  { $eq: ["$weekKey", weekKey] },
                  { $ifNull: ["$weeklyCount", 0] },
                  0,
                ],
              },
              1,
            ],
          },
          monthlyCount: {
            $add: [
              {
                $cond: [
                  { $eq: ["$monthKey", monthKey] },
                  { $ifNull: ["$monthlyCount", 0] },
                  0,
                ],
              },
              1,
            ],
          },
          totalCount: { $add: [{ $ifNull: ["$totalCount", 0] }, 1] },
          weekKey,
          monthKey,
          lastPartnerAt: now,
          updatedAt: now,
        },
      },
    ],
    { upsert: true },
  );

  return db.repositories.counts.findByUser(guildId, userId);
}

function normalizeCountPeriods(count, date = new Date()) {
  if (!count) {
    return null;
  }

  const weekKey = getWeekKey(date);
  const monthKey = getMonthKey(date);

  return {
    ...count,
    weeklyCount: count.weekKey === weekKey ? count.weeklyCount || 0 : 0,
    monthlyCount: count.monthKey === monthKey ? count.monthlyCount || 0 : 0,
    weekKey,
    monthKey,
  };
}

async function getUserCount(db, guildId, userId) {
  const count = await db.repositories.counts.findByUser(guildId, userId);
  return normalizeCountPeriods(count);
}

async function getRanking(db, guildId, type, limit = 10) {
  const fieldByType = {
    semanal: "weeklyCount",
    mensal: "monthlyCount",
    total: "totalCount",
  };
  const periodFilterByType = {
    semanal: { weekKey: getWeekKey() },
    mensal: { monthKey: getMonthKey() },
    total: {},
  };
  const field = fieldByType[type] || "weeklyCount";
  const periodFilter = periodFilterByType[type] || periodFilterByType.semanal;

  return db.repositories.counts.ranking(guildId, field, limit, periodFilter);
}

async function resetCounts(db, guildId, type) {
  const patchByType = {
    semanal: { weeklyCount: 0, weekKey: getWeekKey() },
    mensal: { monthlyCount: 0, monthKey: getMonthKey() },
    total: { weeklyCount: 0, monthlyCount: 0, totalCount: 0, weekKey: getWeekKey(), monthKey: getMonthKey() },
  };

  if (!patchByType[type]) {
    throw new Error("Tipo de contador inválido.");
  }

  const result = await db.repositories.counts.reset(guildId, patchByType[type]);

  return result.modifiedCount;
}

module.exports = {
  getMonthKey,
  getRanking,
  getUserCount,
  getWeekKey,
  incrementPartnershipCount,
  normalizeCountPeriods,
  resetCounts,
};
