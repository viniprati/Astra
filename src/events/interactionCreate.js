const { Events } = require("discord.js");
const { findBlacklistMatch, getCandidatesFromText } = require("../services/blacklistService");
const { incrementPartnershipCount } = require("../services/countService");
const { getGuildConfig, updateGuildConfig } = require("../services/guildConfigService");
const { writeLog } = require("../services/logService");
const { canSendPartnership, hasAdminPermission } = require("../lib/permissions");
const { buildHelpEmbed, buildHelpSelect } = require("../ui/help");
const { buildPanelColorModal, buildPanelEmbed, buildPanelPickerRows, buildPanelRows } = require("../ui/panel");
const { buildPartnershipEmbed, buildPartnershipPreviewRows } = require("../ui/partnership");
const { interactionLogger } = require("../lib/logger");
const {
  observeCommand,
  observeInteraction,
  recordBlacklistCheck,
  recordPartnership,
  setRuntimeMetrics,
} = require("../observability/metrics");
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

function normalizeRequiredUrl(value) {
  const raw = String(value || "").trim();

  if (!raw) {
    return null;
  }

  const normalized = /^(?:www\.)?(?:discord\.gg|discord(?:app)?\.com\/invite)\//i.test(raw)
    ? `https://${raw}`
    : raw;

  return isUrl(normalized) ? normalized : null;
}

function isValidEmbedColor(value) {
  return !value || /^#[0-9a-f]{6}$/i.test(value);
}

function getPartnershipText(draft) {
  return `${draft.title}\n${draft.description}\n${draft.link}\n${draft.image || ""}`;
}

function formatBlacklistBlockMessage(blacklistMatch) {
  return (
    "Essa parceria foi bloqueada pela blacklist.\n" +
    `Item: \`${blacklistMatch.targetType}:${blacklistMatch.targetValue}\`\n` +
    `Motivo: ${blacklistMatch.reason}`
  );
}

async function getInviteGuildCandidates(client, text) {
  const inviteCodes = [
    ...new Set(
      getCandidatesFromText(text)
        .filter((candidate) => candidate.targetType === "invite_link")
        .map((candidate) => candidate.targetValue),
    ),
  ].slice(0, 5);

  const candidates = await Promise.all(
    inviteCodes.map(async (code) => {
      const invite = await client.fetchInvite(code).catch(() => null);
      const guildId = invite?.guild?.id;

      return guildId ? { targetType: "server_id", targetValue: guildId } : null;
    }),
  );

  return candidates.filter(Boolean);
}

async function findPartnershipBlacklistMatch(interaction, draft) {
  const text = getPartnershipText(draft);
  const inviteGuildCandidates = await getInviteGuildCandidates(interaction.client, text);

  return findBlacklistMatch(
    interaction.client.db,
    interaction.guildId,
    text,
    inviteGuildCandidates,
  );
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
  const panelKeys = new Set([
    "partnerChannelId",
    "logChannelId",
    "adminRoleId",
    "promoterRoleId",
    "pingRoleId",
  ]);

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

    if (!panelKeys.has(key)) {
      await interaction.reply({ content: "Configuração inválida.", ephemeral: true });
      return;
    }

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
    recordPartnership("forbidden");
    await interaction.reply({
      content: "Você não tem o cargo necessário para enviar parcerias.",
      ephemeral: true,
    });
    return;
  }

  if (!config.partnerChannelId) {
    recordPartnership("not_configured");
    await interaction.reply({
      content: "O canal de parcerias ainda não foi configurado. Use `/config canal_parcerias`.",
      ephemeral: true,
    });
    return;
  }

  const title = interaction.fields.getTextInputValue("title").trim();
  const description = interaction.fields.getTextInputValue("description").trim();
  const link = normalizeRequiredUrl(interaction.fields.getTextInputValue("link"));
  const image = interaction.fields.getTextInputValue("image").trim();
  const color = interaction.fields.getTextInputValue("color").trim() || config.embedColor;

  if (!link) {
    recordPartnership("invalid_link");
    await interaction.reply({
      content: "Link inválido. Use uma URL `http(s)` ou um convite do Discord.",
      ephemeral: true,
    });
    return;
  }

  if (!isValidEmbedColor(color)) {
    recordPartnership("invalid_color");
    await interaction.reply({
      content: "Cor inválida. Use o formato `#facc15`.",
      ephemeral: true,
    });
    return;
  }

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

  const blacklistMatch = await findPartnershipBlacklistMatch(interaction, draft);

  if (blacklistMatch) {
    recordBlacklistCheck("blocked");
    recordPartnership("blocked");
    await interaction.reply({
      content: formatBlacklistBlockMessage(blacklistMatch),
      ephemeral: true,
    });
    return;
  }

  recordBlacklistCheck("clear");
  await interaction.client.cache.set(`partnership_draft:${draft.id}`, draft, 600);
  recordPartnership("preview_created");

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
    recordPartnership("channel_unavailable");
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
    recordPartnership("preview_expired");
    await interaction.reply({
      content: "Essa prévia expirou. Use `/embed` novamente.",
      ephemeral: true,
    });
    return;
  }

  if (draft.userId !== interaction.user.id) {
    recordPartnership("preview_forbidden");
    await interaction.reply({
      content: "Só quem criou essa prévia pode confirmar ou cancelar.",
      ephemeral: true,
    });
    return;
  }

  if (action === "cancel") {
    recordPartnership("canceled");
    await interaction.client.cache.delete(`partnership_draft:${draftId}`);
    await interaction.update({
      content: "Envio cancelado.",
      embeds: [],
      components: [],
    });
    return;
  }

  await interaction.deferUpdate();

  const blacklistMatch = await findPartnershipBlacklistMatch(interaction, draft);

  if (blacklistMatch) {
    recordBlacklistCheck("blocked");
    recordPartnership("blocked");
    await interaction.editReply({
      content: formatBlacklistBlockMessage(blacklistMatch),
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
    const startedAt = Date.now();
    let status = "ignored";

    try {
      if (!interaction.inGuild()) {
        if (interaction.isRepliable()) {
          await interaction.reply({ content: "Use meus comandos dentro de um servidor.", ephemeral: true });
        }
        status = "dm_rejected";
        return;
      }

      if (interaction.isChatInputCommand()) {
        await handleCommand(interaction);
        status = "success";
        return;
      }

      if (interaction.isStringSelectMenu() && interaction.customId === "help:category") {
        await handleHelpSelect(interaction);
        status = "success";
        return;
      }

      if (interaction.customId?.startsWith("panel:")) {
        await handlePanelInteraction(interaction);
        status = "success";
        return;
      }

      if (interaction.isModalSubmit() && interaction.customId === "partnership:create") {
        await handlePartnershipModal(interaction);
        status = "success";
        return;
      }

      if (interaction.isButton() && interaction.customId?.startsWith("partnership:")) {
        await handlePartnershipButton(interaction);
        status = "success";
      }
    } catch (error) {
      status = "error";
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
    } finally {
      observeInteraction(interaction, status, startedAt);
      setRuntimeMetrics(interaction.client);
    }
  },
};
