function blacklistRepository(collection) {
  return {
    upsert(document) {
      return collection.updateOne(
        {
          guildId: document.guildId,
          targetType: document.targetType,
          targetValue: document.targetValue,
        },
        { $set: document },
        { upsert: true },
      );
    },

    delete(guildId, targetType, targetValue) {
      return collection.deleteOne({ guildId, targetType, targetValue });
    },

    list(guildId, limit = 15) {
      return collection.find({ guildId }).sort({ createdAt: -1 }).limit(limit).toArray();
    },

    findOne(query) {
      return collection.findOne(query);
    },
  };
}

module.exports = { blacklistRepository };
