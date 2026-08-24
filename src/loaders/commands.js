const fs = require("node:fs/promises");
const path = require("node:path");

async function loadCommands(client) {
  const commandsPath = path.join(__dirname, "..", "commands");
  const files = (await fs.readdir(commandsPath)).filter((file) => file.endsWith(".js"));

  for (const file of files) {
    const command = require(path.join(commandsPath, file));
    client.commands.set(command.data.name, command);
  }
}

function getCommandPayloads(client) {
  return client.commands.map((command) => command.data.toJSON());
}

module.exports = { loadCommands, getCommandPayloads };
