const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  ChannelType,
  EmbedBuilder,
  ModalBuilder,
  RoleSelectMenuBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");
const { colorToNumber } = require("../services/guildConfigService");

function formatChannel(id) {
  return id ? `<#${id}>` : "`não configurado`";
}

function formatRole(id) {
  return id ? `<@&${id}>` : "`não configurado`";
}

function buildPanelEmbed(config) {
  return new EmbedBuilder()
    .setTitle("🛠️ Painel Administrativo")
    .setDescription("Gerencie atalhos, configurações e manutenção do sistema de parcerias.")
    .setColor(colorToNumber(config.embedColor))
    .addFields(
      {
        name: "Canais",
        value: `Parcerias: ${formatChannel(config.partnerChannelId)}\nLogs: ${formatChannel(config.logChannelId)}`,
        inline: true,
      },
      {
        name: "Cargos",
        value:
          `Admin: ${formatRole(config.adminRoleId)}\n` +
          `Promotor: ${formatRole(config.promoterRoleId)}\n` +
          `Ping: ${formatRole(config.pingRoleId)}`,
        inline: true,
      },
      {
        name: "Envio",
        value: `Ping automático: ${config.autoPing ? "`ligado`" : "`desligado`"}\nCor: \`${config.embedColor}\``,
        inline: false,
      },
    );
}

function buildPanelRows() {
  const menu = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("panel:config_action")
      .setPlaceholder("Escolha o que deseja configurar...")
      .addOptions([
        {
          label: "Canal de parcerias",
          value: "partnerChannelId",
          description: "Onde as parcerias serão enviadas.",
          emoji: "📨",
        },
        {
          label: "Canal de logs",
          value: "logChannelId",
          description: "Onde os logs administrativos serão enviados.",
          emoji: "📋",
        },
        {
          label: "Cargo admin",
          value: "adminRoleId",
          description: "Quem pode administrar o bot no servidor.",
          emoji: "⚙️",
        },
        {
          label: "Cargo promotor",
          value: "promoterRoleId",
          description: "Quem pode enviar parcerias.",
          emoji: "📣",
        },
        {
          label: "Cargo de ping",
          value: "pingRoleId",
          description: "Cargo mencionado no ping automático.",
          emoji: "🔔",
        },
        {
          label: "Ping automático",
          value: "toggleAutoPing",
          description: "Liga ou desliga o ping nos envios.",
          emoji: "🔁",
        },
        {
          label: "Cor dos embeds",
          value: "embedColor",
          description: "Altera a cor padrão das parcerias.",
          emoji: "🎨",
        },
      ]),
  );

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("panel:refresh")
      .setLabel("Atualizar")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("🔄"),
  );

  return [menu, buttons];
}

function buildPanelPickerRows(key) {
  if (key === "partnerChannelId" || key === "logChannelId") {
    const labels = {
      partnerChannelId: "Selecione o canal de parcerias",
      logChannelId: "Selecione o canal de logs",
    };

    return [
      new ActionRowBuilder().addComponents(
        new ChannelSelectMenuBuilder()
          .setCustomId(`panel:set:${key}`)
          .setPlaceholder(labels[key])
          .setChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
          .setMinValues(1)
          .setMaxValues(1),
      ),
    ];
  }

  const labels = {
    adminRoleId: "Selecione o cargo admin",
    promoterRoleId: "Selecione o cargo promotor",
    pingRoleId: "Selecione o cargo de ping",
  };

  return [
    new ActionRowBuilder().addComponents(
      new RoleSelectMenuBuilder()
        .setCustomId(`panel:set:${key}`)
        .setPlaceholder(labels[key] || "Selecione um cargo")
        .setMinValues(1)
        .setMaxValues(1),
    ),
  ];
}

function buildPanelColorModal(currentColor) {
  return new ModalBuilder()
    .setCustomId("panel:color_modal")
    .setTitle("Cor padrão dos embeds")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("embedColor")
          .setLabel("Cor em hexadecimal")
          .setStyle(TextInputStyle.Short)
          .setValue(currentColor || "#facc15")
          .setPlaceholder("#facc15")
          .setRequired(true),
      ),
    );
}

module.exports = {
  buildPanelEmbed,
  buildPanelColorModal,
  buildPanelPickerRows,
  buildPanelRows,
};
