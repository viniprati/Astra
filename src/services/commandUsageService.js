async function recordCommandUsage(db, payload) {
  await db.commandUsage.insertOne({
    guildId: payload.guildId,
    userId: payload.userId,
    commandName: payload.commandName,
    status: payload.status,
    durationMs: payload.durationMs,
    createdAt: new Date(),
  });
}

module.exports = { recordCommandUsage };
