const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");
const { colorToNumber } = require("../services/guildConfigService");

function buildPartnershipEmbed(draft, senderTag = null) {
  const embed = new EmbedBuilder()
    .setTitle(draft.title)
    .setDescription(`${draft.description}\n\n${draft.link}`)
    .setColor(colorToNumber(draft.color))
    .setTimestamp();

  if (senderTag) {
    embed.setFooter({ text: `Enviado por ${senderTag}` });
  }

  if (draft.image) {
    embed.setImage(draft.image);
  }

  return embed;
}

function buildPartnershipPreviewRows(draftId) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`partnership:confirm:${draftId}`)
        .setLabel("Enviar")
        .setStyle(ButtonStyle.Success)
        .setEmoji("✅"),
      new ButtonBuilder()
        .setCustomId(`partnership:cancel:${draftId}`)
        .setLabel("Cancelar")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("✖️"),
    ),
  ];
}

module.exports = {
  buildPartnershipEmbed,
  buildPartnershipPreviewRows,
};
