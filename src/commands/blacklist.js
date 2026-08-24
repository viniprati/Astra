const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");
const {
  addBlacklistItem,
  checkBlacklistValue,
  listBlacklistItems,
  removeBlacklistItem,
} = require("../services/blacklistService");
const { getGuildConfig } = require("../services/guildConfigService");
const { hasAdminPermission } = require("../lib/permissions");

const targetChoices = [
  ["Servidor ID", "server_id"],
  ["Usuário ID", "user_id"],
  ["Convite", "invite_link"],
  ["Link completo", "link"],
  ["Domínio", "domain"],
];

function addTargetChoices(option) {
  return option
    .setName("tipo")
    .setDescription("Tipo de item.")
    .setRequired(true)
    .addChoices(...targetChoices.map(([name, value]) => ({ name, value })));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("blacklist")
    .setDescription("Gerencia a blacklist de parcerias.")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("add")
        .setDescription("Adiciona um item na blacklist.")
        .addStringOption(addTargetChoices)
        .addStringOption((option) => option.setName("valor").setDescription("ID, link, convite ou domínio.").setRequired(true))
        .addStringOption((option) => option.setName("motivo").setDescription("Motivo do bloqueio.").setRequired(true)),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("remove")
        .setDescription("Remove um item da blacklist.")
        .addStringOption(addTargetChoices)
        .addStringOption((option) => option.setName("valor").setDescription("Item bloqueado.").setRequired(true)),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("check")
        .setDescription("Verifica se um item está bloqueado.")
        .addStringOption(addTargetChoices)
        .addStringOption((option) => option.setName("valor").setDescription("Item para consultar.").setRequired(true)),
    )
    .addSubcommand((subcommand) => subcommand.setName("list").setDescription("Lista os bloqueios recentes.")),

  async execute(interaction) {
    const config = await getGuildConfig(interaction.client.db, interaction.guildId);

    if (!hasAdminPermission(interaction.member, config)) {
      await interaction.reply({ content: "Você não tem permissão para gerenciar a blacklist.", ephemeral: true });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "add") {
      const item = await addBlacklistItem(interaction.client.db, interaction.guildId, {
        targetType: interaction.options.getString("tipo"),
        targetValue: interaction.options.getString("valor"),
        reason: interaction.options.getString("motivo"),
        addedBy: interaction.user.id,
      });

      await interaction.reply({
        content: `Item bloqueado: \`${item.targetType}:${item.targetValue}\`\nMotivo: ${item.reason}`,
        ephemeral: true,
      });
      return;
    }

    if (subcommand === "remove") {
      const removed = await removeBlacklistItem(
        interaction.client.db,
        interaction.guildId,
        interaction.options.getString("tipo"),
        interaction.options.getString("valor"),
      );

      await interaction.reply({
        content: removed ? "Item removido da blacklist." : "Esse item não estava na blacklist.",
        ephemeral: true,
      });
      return;
    }

    if (subcommand === "check") {
      const item = await checkBlacklistValue(
        interaction.client.db,
        interaction.guildId,
        interaction.options.getString("tipo"),
        interaction.options.getString("valor"),
      );

      await interaction.reply({
        content: item
          ? `Bloqueado: \`${item.targetType}:${item.targetValue}\`\nMotivo: ${item.reason}`
          : "Nenhum bloqueio encontrado para esse item.",
        ephemeral: true,
      });
      return;
    }

    const items = await listBlacklistItems(interaction.client.db, interaction.guildId);
    const embed = new EmbedBuilder()
      .setTitle("⛔ Blacklist")
      .setColor(0xef4444)
      .setDescription(
        items.length
          ? items.map((item, index) => `**${index + 1}.** \`${item.targetType}:${item.targetValue}\`\nMotivo: ${item.reason}`).join("\n\n")
          : "Nenhum item bloqueado.",
      );

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
