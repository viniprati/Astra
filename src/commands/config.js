const {
  ChannelType,
  EmbedBuilder,
  SlashCommandBuilder,
} = require("discord.js");
const { getGuildConfig, updateGuildConfig } = require("../services/guildConfigService");
const { hasAdminPermission } = require("../lib/permissions");

function configSummary(config) {
  return new EmbedBuilder()
    .setTitle("⚙️ Configuração do Astra")
    .setColor(0xfacc15)
    .addFields(
      { name: "Canal de parcerias", value: config.partnerChannelId ? `<#${config.partnerChannelId}>` : "`não configurado`", inline: true },
      { name: "Canal de logs", value: config.logChannelId ? `<#${config.logChannelId}>` : "`não configurado`", inline: true },
      { name: "Cargo admin", value: config.adminRoleId ? `<@&${config.adminRoleId}>` : "`não configurado`", inline: true },
      { name: "Cargo promotor", value: config.promoterRoleId ? `<@&${config.promoterRoleId}>` : "`não configurado`", inline: true },
      { name: "Cargo de ping", value: config.pingRoleId ? `<@&${config.pingRoleId}>` : "`não configurado`", inline: true },
      { name: "Ping automático", value: config.autoPing ? "`ligado`" : "`desligado`", inline: true },
      { name: "Cor padrão", value: `\`${config.embedColor}\``, inline: true },
    );
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("config")
    .setDescription("Configura o sistema de parcerias.")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("canal_parcerias")
        .setDescription("Define o canal onde as parcerias serão enviadas.")
        .addChannelOption((option) =>
          option
            .setName("canal")
            .setDescription("Canal de parcerias.")
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("canal_logs")
        .setDescription("Define o canal de logs.")
        .addChannelOption((option) =>
          option
            .setName("canal")
            .setDescription("Canal de logs.")
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("cargo_admin")
        .setDescription("Define o cargo que pode administrar o bot.")
        .addRoleOption((option) => option.setName("cargo").setDescription("Cargo admin.").setRequired(true)),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("cargo_promotor")
        .setDescription("Define o cargo que pode enviar parcerias.")
        .addRoleOption((option) => option.setName("cargo").setDescription("Cargo promotor.").setRequired(true)),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("cargo_ping")
        .setDescription("Define o cargo pingado nas parcerias.")
        .addRoleOption((option) => option.setName("cargo").setDescription("Cargo de ping.").setRequired(true)),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("ping_auto")
        .setDescription("Liga ou desliga o ping automático.")
        .addBooleanOption((option) =>
          option.setName("ativo").setDescription("Estado do ping automático.").setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("cor_embed")
        .setDescription("Define a cor padrão dos embeds. Exemplo: #facc15")
        .addStringOption((option) => option.setName("cor").setDescription("Cor em hexadecimal.").setRequired(true)),
    )
    .addSubcommand((subcommand) => subcommand.setName("ver").setDescription("Mostra a configuração atual.")),

  async execute(interaction) {
    const config = await getGuildConfig(interaction.client.db, interaction.guildId);
    const subcommand = interaction.options.getSubcommand();

    if (subcommand !== "ver" && !hasAdminPermission(interaction.member, config)) {
      await interaction.reply({ content: "Você não tem permissão para alterar configurações.", ephemeral: true });
      return;
    }

    if (subcommand === "ver") {
      await interaction.reply({ embeds: [configSummary(config)], ephemeral: true });
      return;
    }

    const patchBySubcommand = {
      canal_parcerias: () => ({ partnerChannelId: interaction.options.getChannel("canal").id }),
      canal_logs: () => ({ logChannelId: interaction.options.getChannel("canal").id }),
      cargo_admin: () => ({ adminRoleId: interaction.options.getRole("cargo").id }),
      cargo_promotor: () => ({ promoterRoleId: interaction.options.getRole("cargo").id }),
      cargo_ping: () => ({ pingRoleId: interaction.options.getRole("cargo").id }),
      ping_auto: () => ({ autoPing: interaction.options.getBoolean("ativo") }),
      cor_embed: () => {
        const color = interaction.options.getString("cor").trim();
        if (!/^#[0-9a-f]{6}$/i.test(color)) {
          throw new Error("Cor inválida. Use o formato `#facc15`.");
        }
        return { embedColor: color.toLowerCase() };
      },
    };

    try {
      const updated = await updateGuildConfig(interaction.client.db, interaction.guildId, patchBySubcommand[subcommand]());
      await interaction.reply({
        content: "Configuração atualizada.",
        embeds: [configSummary(updated)],
        ephemeral: true,
      });
    } catch (error) {
      await interaction.reply({ content: error.message, ephemeral: true });
    }
  },
};
