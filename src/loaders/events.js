const fs = require("node:fs/promises");
const path = require("node:path");

async function loadEvents(client) {
  const eventsPath = path.join(__dirname, "..", "events");
  const files = (await fs.readdir(eventsPath)).filter((file) => file.endsWith(".js"));

  for (const file of files) {
    const event = require(path.join(eventsPath, file));
    const listener = (...args) => event.execute(...args, client);

    if (event.once) {
      client.once(event.name, listener);
    } else {
      client.on(event.name, listener);
    }
  }
}

module.exports = { loadEvents };
