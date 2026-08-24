const {
  ActionRowBuilder,
  EmbedBuilder,
  StringSelectMenuBuilder,
} = require("discord.js");

const HELP_CATEGORIES = {
  overview: {
    label: "Central",
    emoji: "🤖",
    title: "🤖 Central de Ajuda",
    description:
      "Escolha uma categoria no menu abaixo para ver os comandos disponíveis.\n" +
      "Os selos indicam se o comando é público, staff, admin ou de configuração.",
    fields: [
      {
        name: "🏆 Geral e Rankings",
        value: "Perfil, ranking de promotoria, contador semanal, mensal e total.\n`6 comandos`",
      },
      {
        name: "📨 Parcerias",
        value: "Criar embed, validar link, enviar parceria e registrar divulgação.\n`5 comandos`",
      },
      {
        name: "⛔ Blacklist",
        value: "Bloqueio por servidor, usuário, convite, link, domínio e motivo.\n`7 comandos`",
      },
      {
        name: "⚙️ Configurações",
        value: "Canais, cargos, logs, cor padrão, permissões e ping automático.\n`8 comandos`",
      },
      {
        name: "🛠️ Staff",
        value: "Painel administrativo, resets, auditoria e manutenção do servidor.\n`6 comandos`",
      },
      {
        name: "🔒 Proteção Automática",
        value: "Verificação antes do envio, resposta privada com motivo e logs.\n`4 sistemas`",
      },
    ],
  },
  partnerships: {
    label: "Parcerias",
    emoji: "📨",
    title: "📨 Parcerias",
    description: "Comandos para criar, validar e enviar divulgações.",
    fields: [
      { name: "/embed", value: "`Público` Abre um formulário para montar a parceria em embed." },
      { name: "/contador ver", value: "`Público` Mostra sua contagem ou a de outro usuário." },
      { name: "Envio automático", value: "Valida blacklist, manda no canal configurado e soma no ranking." },
    ],
  },
  rankings: {
    label: "Geral e Rankings",
    emoji: "🏆",
    title: "🏆 Geral e Rankings",
    description: "Comandos para acompanhar produtividade de parcerias.",
    fields: [
      { name: "/ranking semanal", value: "`Público` Top promotores da semana atual." },
      { name: "/ranking mensal", value: "`Público` Top promotores do mês atual." },
      { name: "/ranking total", value: "`Público` Ranking histórico do servidor." },
      { name: "/contador ver", value: "`Público` Consulta semanal, mensal e total de um usuário." },
    ],
  },
  blacklist: {
    label: "Blacklist",
    emoji: "⛔",
    title: "⛔ Blacklist",
    description: "Comandos para impedir envios problemáticos.",
    fields: [
      { name: "/blacklist add", value: "`Admin` Bloqueia servidor, usuário, convite, link ou domínio." },
      { name: "/blacklist remove", value: "`Admin` Remove um item bloqueado." },
      { name: "/blacklist list", value: "`Admin` Lista os últimos bloqueios." },
      { name: "/blacklist check", value: "`Staff` Consulta se um item está bloqueado e mostra o motivo." },
    ],
  },
  settings: {
    label: "Configurações",
    emoji: "⚙️",
    title: "⚙️ Configurações",
    description: "Prepare o servidor pelo `/painel` ou, se preferir, pelos comandos abaixo.",
    fields: [
      { name: "/painel", value: "`Admin` Abre a configuração visual com seletores de canal, cargo, ping e cor." },
      { name: "/config canal_parcerias", value: "`Admin` Define onde as parcerias serão publicadas." },
      { name: "/config canal_logs", value: "`Admin` Define o canal de logs." },
      { name: "/config cargo_admin", value: "`Admin` Define o cargo que gerencia o bot." },
      { name: "/config cargo_promotor", value: "`Admin` Define quem pode enviar parcerias." },
      { name: "/config ping_auto", value: "`Admin` Liga ou desliga ping automático." },
      { name: "/config cargo_ping", value: "`Admin` Define o cargo pingado nas parcerias." },
      { name: "/config cor_embed", value: "`Admin` Define a cor padrão dos embeds." },
      { name: "/config ver", value: "`Staff` Mostra a configuração atual." },
    ],
  },
  staff: {
    label: "Staff",
    emoji: "🛠️",
    title: "🛠️ Staff",
    description: "Ferramentas administrativas e manutenção.",
    fields: [
      { name: "/painel", value: "`Admin` Abre o painel para configurar o servidor sem decorar comandos." },
      { name: "/contador reset", value: "`Admin` Reseta contagens semanal, mensal ou total." },
      { name: "/blacklist check", value: "`Staff` Ajuda a investigar links antes de liberar envio." },
    ],
  },
};

function getBotAvatar(client) {
  return client.user?.displayAvatarURL({ size: 256 }) || null;
}

function buildHelpEmbed(client, category = "overview") {
  const data = HELP_CATEGORIES[category] || HELP_CATEGORIES.overview;
  const embed = new EmbedBuilder()
    .setTitle(data.title)
    .setDescription(data.description)
    .setColor(0xfacc15)
    .setFooter({ text: "Use os comandos com /" });

  const avatar = getBotAvatar(client);
  if (avatar) {
    embed.setThumbnail(avatar);
  }

  for (const field of data.fields) {
    embed.addFields({ ...field, inline: category === "overview" });
  }

  return embed;
}

function buildHelpSelect(selected = "overview") {
  const options = Object.entries(HELP_CATEGORIES).map(([value, category]) => ({
    label: category.label,
    value,
    emoji: category.emoji,
    default: value === selected,
  }));

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("help:category")
      .setPlaceholder("Escolha uma categoria...")
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(options),
  );
}

module.exports = {
  HELP_CATEGORIES,
  buildHelpEmbed,
  buildHelpSelect,
};
