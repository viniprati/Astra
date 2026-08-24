const { Events } = require("discord.js");
const { findBlacklistMatch } = require("../services/blacklistService");
const { incrementPartnershipCount } = require("../services/countService");
const { getGuildConfig, updateGuildConfig } = require("../services/guildConfigService");
const { writeLog } = require("../services/logService");
const { canSendPartnership, hasAdminPermission } = require("../lib/permissions");
const { buildHelpEmbed, buildHelpSelect } = require("../ui/help");
const { buildPanelColorModal, buildPanelEmbed, buildPanelPickerRows, buildPanelRows } = require("../ui/panel");
const { buildPartnershipEmbed, buildPartnershipPreviewRows } = require("../ui/partnership");
const { interactionLogger } = require("../lib/logger");
const { observeCommand, recordBlacklistCheck, recordPartnership } = require("../observability/metrics");
const { recordCommandUsage } = require("../services/commandUsageService");
const { checkCommandCooldown } = require("../services/rateLimitService");

function isUrl(value) {
  if (!value) {
    return false;
  }

  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

async function handleCommand(interaction) {
  const command = interaction.client.commands.get(interaction.commandName);

  if (!command) {
    await interaction.reply({ content: "Comando não encontrado.", ephemeral: true });
    return;
  }

  const startedAt = Date.now();

  try {
    const cooldown = await checkCommandCooldown(
      interaction.client.cache,
      interaction.guildId,
      interaction.user.id,
      interaction.commandName,
    );

    if (cooldown.limited) {
      observeCommand(interaction.commandName, "rate_limited", startedAt);
      await interaction.reply({
        content: `Calma um pouco. Tente novamente em ${cooldown.retryAfterSeconds}s.`,
        ephemeral: true,
      });
      return;
    }

    await command.execute(interaction);
    observeCommand(interaction.commandName, "success", startedAt);
    await recordCommandUsage(interaction.client.db, {
      guildId: interaction.guildId,
      userId: interaction.user.id,
      commandName: interaction.commandName,
      status: "success",
      durationMs: Date.now() - startedAt,
    }).catch(() => null);
  } catch (error) {
    observeCommand(interaction.commandName, "error", startedAt);
    await recordCommandUsage(interaction.client.db, {
      guildId: interaction.guildId,
      userId: interaction.user.id,
      commandName: interaction.commandName,
      status: "error",
      durationMs: Date.now() - startedAt,
    }).catch(() => null);
    throw error;
  }
}

async function handleHelpSelect(interaction) {
  const category = interaction.values[0];

  await interaction.update({
    embeds: [buildHelpEmbed(interaction.client, category)],
    components: [buildHelpSelect(category)],
  });
}

async function handlePanelInteraction(interaction) {
  const config = await getGuildConfig(interaction.client.db, interaction.guildId);

  if (!hasAdminPermission(interaction.member, config)) {
    await interaction.reply({ content: "Você não tem permissão para usar este painel.", ephemeral: true });
    return;
  }

  if (interaction.isButton()) {
    if (interaction.customId === "panel:refresh") {
      await interaction.update({
        embeds: [buildPanelEmbed(config)],
        components: buildPanelRows(),
      });
      return;
    }
  }

  if (interaction.isStringSelectMenu() && interaction.customId === "panel:config_action") {
    const action = interaction.values[0];

    if (action === "toggleAutoPing") {
      const updated = await updateGuildConfig(interaction.client.db, interaction.guildId, {
        autoPing: !config.autoPing,
      });

      await interaction.update({
        embeds: [buildPanelEmbed(updated)],
        components: buildPanelRows(),
      });
      return;
    }

    if (action === "embedColor") {
      await interaction.showModal(buildPanelColorModal(config.embedColor));
      return;
    }

    await interaction.reply({
      content: "Selecione o novo valor.",
      components: buildPanelPickerRows(action),
      ephemeral: true,
    });
    return;
  }

  if ((interaction.isChannelSelectMenu() || interaction.isRoleSelectMenu()) && interaction.customId.startsWith("panel:set:")) {
    const key = interaction.customId.split(":")[2];
    const value = interaction.values[0];
    const updated = await updateGuildConfig(interaction.client.db, interaction.guildId, {
      [key]: value,
    });

    await interaction.update({
      content: "✅ Configuração atualizada.",
      embeds: [buildPanelEmbed(updated)],
      components: [],
    });
    return;
  }

  if (interaction.isModalSubmit() && interaction.customId === "panel:color_modal") {
    const color = interaction.fields.getTextInputValue("embedColor").trim();

    if (!/^#[0-9a-f]{6}$/i.test(color)) {
      await interaction.reply({
        content: "Cor inválida. Use o formato `#facc15`.",
        ephemeral: true,
      });
      return;
    }

    const updated = await updateGuildConfig(interaction.client.db, interaction.guildId, {
      embedColor: color.toLowerCase(),
    });

    await interaction.reply({
      content: "✅ Cor atualizada.",
      embeds: [buildPanelEmbed(updated)],
      ephemeral: true,
    });
  }
}

async function handlePartnershipModal(interaction) {
  const config = await getGuildConfig(interaction.client.db, interaction.guildId);

  if (!canSendPartnership(interaction.member, config)) {
    await interaction.reply({
      content: "Você não tem o cargo necessário para enviar parcerias.",
      ephemeral: true,
    });
    return;
  }

  if (!config.partnerChannelId) {
    await interaction.reply({
      content: "O canal de parcerias ainda não foi configurado. Use `/config canal_parcerias`.",
      ephemeral: true,
    });
    return;
  }

  const title = interaction.fields.getTextInputValue("title").trim();
  const description = interaction.fields.getTextInputValue("description").trim();
  const link = interaction.fields.getTextInputValue("link").trim();
  const image = interaction.fields.getTextInputValue("image").trim();
  const color = interaction.fields.getTextInputValue("color").trim() || config.embedColor;
  const draft = {
    id: interaction.id,
    guildId: interaction.guildId,
    userId: interaction.user.id,
    title,
    description,
    link,
    image: isUrl(image) ? image : null,
    color,
    createdAt: Date.now(),
  };

  const blacklistMatch = await findBlacklistMatch(
    interaction.client.db,
    interaction.guildId,
    `${draft.title}\n${draft.description}\n${draft.link}\n${draft.image || ""}`,
  );

  if (blacklistMatch) {
    recordBlacklistCheck("blocked");
    recordPartnership("blocked");
    await interaction.reply({
      content:
        "Essa parceria foi bloqueada pela blacklist.\n" +
        `Item: \`${blacklistMatch.targetType}:${blacklistMatch.targetValue}\`\n` +
        `Motivo: ${blacklistMatch.reason}`,
      ephemeral: true,
    });
    return;
  }

  recordBlacklistCheck("clear");
  await interaction.client.cache.set(`partnership_draft:${draft.id}`, draft, 600);

  await interaction.reply({
    content: "Confira a prévia da parceria antes de enviar.",
    embeds: [buildPartnershipEmbed(draft, interaction.user.tag)],
    components: buildPartnershipPreviewRows(draft.id),
    ephemeral: true,
  });
}

async function sendPartnershipDraft(interaction, draft) {
  const config = await getGuildConfig(interaction.client.db, interaction.guildId);
  const channel = await interaction.guild.channels.fetch(config.partnerChannelId).catch(() => null);
  if (!channel || !channel.isTextBased()) {
    await interaction.editReply({
      content: "Não consegui acessar o canal de parcerias configurado.",
      embeds: [],
      components: [],
    });
    return;
  }

  const embed = buildPartnershipEmbed(draft, interaction.user.tag);

  const content = config.autoPing && config.pingRoleId ? `<@&${config.pingRoleId}>` : null;
  const sentMessage = await channel.send({
    content,
    embeds: [embed],
    allowedMentions: config.autoPing && config.pingRoleId ? { roles: [config.pingRoleId] } : { parse: [] },
  });

  const count = await incrementPartnershipCount(interaction.client.db, interaction.guildId, interaction.user.id);
  recordPartnership("sent");

  await writeLog(interaction.client.db, interaction.guild, {
    title: "Parceria enviada",
    description:
      `${interaction.user} enviou uma parceria em ${channel}.\n` +
      `Mensagem: ${sentMessage.url}\n` +
      `Contagem semanal: ${count.weeklyCount} | mensal: ${count.monthlyCount} | total: ${count.totalCount}`,
    color: 0x22c55e,
  });

  await interaction.editReply({
    content:
      `Parceria enviada em ${channel}.\n` +
      `Sua contagem agora é: semanal **${count.weeklyCount}**, mensal **${count.monthlyCount}**, total **${count.totalCount}**.`,
    embeds: [],
    components: [],
  });
}

async function handlePartnershipButton(interaction) {
  const [, action, draftId] = interaction.customId.split(":");
  const draft = await interaction.client.cache.get(`partnership_draft:${draftId}`);

  if (!draft) {
    await interaction.reply({
      content: "Essa prévia expirou. Use `/embed` novamente.",
      ephemeral: true,
    });
    return;
  }

  if (draft.userId !== interaction.user.id) {
    await interaction.reply({
      content: "Só quem criou essa prévia pode confirmar ou cancelar.",
      ephemeral: true,
    });
    return;
  }

  if (action === "cancel") {
    await interaction.client.cache.delete(`partnership_draft:${draftId}`);
    await interaction.update({
      content: "Envio cancelado.",
      embeds: [],
      components: [],
    });
    return;
  }

  await interaction.deferUpdate();

  const blacklistMatch = await findBlacklistMatch(
    interaction.client.db,
    interaction.guildId,
    `${draft.title}\n${draft.description}\n${draft.link}\n${draft.image || ""}`,
  );

  if (blacklistMatch) {
    recordBlacklistCheck("blocked");
    recordPartnership("blocked");
    await interaction.editReply({
      content:
        "Essa parceria foi bloqueada pela blacklist.\n" +
        `Item: \`${blacklistMatch.targetType}:${blacklistMatch.targetValue}\`\n` +
        `Motivo: ${blacklistMatch.reason}`,
      embeds: [],
      components: [],
    });
    return;
  }

  recordBlacklistCheck("clear");
  await interaction.client.cache.delete(`partnership_draft:${draftId}`);
  await sendPartnershipDraft(interaction, draft);
}

module.exports = {
  name: Events.InteractionCreate,

  async execute(interaction) {
    const log = interactionLogger(interaction);

    try {
      if (!interaction.inGuild()) {
        if (interaction.isRepliable()) {
          await interaction.reply({ content: "Use meus comandos dentro de um servidor.", ephemeral: true });
        }
        return;
      }

      if (interaction.isChatInputCommand()) {
        await handleCommand(interaction);
        return;
      }

      if (interaction.isStringSelectMenu() && interaction.customId === "help:category") {
        await handleHelpSelect(interaction);
        return;
      }

      if (interaction.customId?.startsWith("panel:")) {
        await handlePanelInteraction(interaction);
        return;
      }

      if (interaction.isModalSubmit() && interaction.customId === "partnership:create") {
        await handlePartnershipModal(interaction);
        return;
      }

      if (interaction.isButton() && interaction.customId?.startsWith("partnership:")) {
        await handlePartnershipButton(interaction);
      }
    } catch (error) {
      log.error({ event: "interaction_failed", error: error.message, stack: error.stack }, "interaction failed");

      const payload = {
        content: "Algo deu errado ao processar essa interação.",
        ephemeral: true,
      };

      if (interaction.deferred || interaction.replied) {
        await interaction.followUp(payload).catch(() => null);
      } else if (interaction.isRepliable()) {
        await interaction.reply(payload).catch(() => null);
      }
    }
  },
};
