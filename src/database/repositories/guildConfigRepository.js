function guildConfigRepository(collection) {
  return {
    findByGuildId(guildId) {
      return collection.findOne({ guildId });
    },

    async upsert(guildId, patch, insertDefaults = {}) {
      await collection.updateOne(
        { guildId },
        {
          $set: patch,
          $setOnInsert: {
            guildId,
            createdAt: new Date(),
            ...insertDefaults,
          },
        },
        { upsert: true },
      );

      return collection.findOne({ guildId });
    },
  };
}

module.exports = { guildConfigRepository };
