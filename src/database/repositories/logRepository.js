function logRepository(collection) {
  return {
    insert(document) {
      return collection.insertOne(document);
    },
  };
}

module.exports = { logRepository };
