const fs = require("node:fs/promises");
const path = require("node:path");

async function loadCommands(client) {
  const commandsPath = path.join(__dirname, "..", "commands");
  const files = (await fs.readdir(commandsPath)).filter((file) => file.endsWith(".js"));

  for (const file of files) {
    const command = require(path.join(commandsPath, file));

    if (!command?.data?.name || typeof command.execute !== "function") {
      throw new Error(`Comando inválido em ${file}.`);
    }

    if (client.commands.has(command.data.name)) {
      throw new Error(`Comando duplicado: ${command.data.name} em ${file}.`);
    }

    client.commands.set(command.data.name, command);
  }
}

function getCommandPayloads(client) {
  return client.commands.map((command) => command.data.toJSON());
}

module.exports = { loadCommands, getCommandPayloads };
