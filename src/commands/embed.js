const {
  ActionRowBuilder,
  ModalBuilder,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");
const { getGuildConfig } = require("../services/guildConfigService");
const { canSendPartnership } = require("../lib/permissions");
const { trackInteraction } = require("../analytics/posthog");

function input(customId, label, style, required = true, placeholder = null) {
  const component = new TextInputBuilder()
    .setCustomId(customId)
    .setLabel(label)
    .setStyle(style)
    .setRequired(required);

  if (placeholder) {
    component.setPlaceholder(placeholder);
  }

  return new ActionRowBuilder().addComponents(component);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("embed")
    .setDescription("Cria e envia uma parceria em embed."),

  async execute(interaction) {
    const config = await getGuildConfig(interaction.client.db, interaction.guildId);

    if (!canSendPartnership(interaction.member, config)) {
      await interaction.reply({
        content: "Você não tem o cargo necessário para enviar parcerias.",
        ephemeral: true,
      });
      return;
    }

    trackInteraction(interaction, "partnership_modal_opened", {
      auto_ping_enabled: Boolean(config.autoPing && config.pingRoleId),
    });

    const modal = new ModalBuilder()
      .setCustomId("partnership:create")
      .setTitle("Nova Parceria")
      .addComponents(
        input("title", "Título", TextInputStyle.Short, true, "Nome do servidor ou projeto"),
        input("description", "Descrição", TextInputStyle.Paragraph, true, "Texto da parceria"),
        input("link", "Link ou convite", TextInputStyle.Short, true, "https://discord.gg/..."),
        input("image", "Imagem/banner", TextInputStyle.Short, false, "https://..."),
        input("color", "Cor do embed", TextInputStyle.Short, false, "#facc15"),
      );

    await interaction.showModal(modal);
  },
};
