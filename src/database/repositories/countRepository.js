function countRepository(collection) {
  return {
    findByUser(guildId, userId) {
      return collection.findOne({ guildId, userId });
    },

    updateOne(filter, update, options) {
      return collection.updateOne(filter, update, options);
    },

    ranking(guildId, field, limit, extraFilter = {}) {
      return collection
        .find({ guildId, ...extraFilter, [field]: { $gt: 0 } })
        .sort({ [field]: -1, updatedAt: -1 })
        .limit(limit)
        .toArray();
    },

    reset(guildId, patch) {
      return collection.updateMany(
        { guildId },
        { $set: { ...patch, updatedAt: new Date() } },
      );
    },
  };
}

module.exports = { countRepository };
