const { PermissionFlagsBits } = require("discord.js");

function hasAdminPermission(member, config) {
  if (!member) {
    return false;
  }

  if (member.permissions?.has(PermissionFlagsBits.Administrator)) {
    return true;
  }

  if (config?.adminRoleId && member.roles?.cache?.has(config.adminRoleId)) {
    return true;
  }

  return false;
}

function canSendPartnership(member, config) {
  if (hasAdminPermission(member, config)) {
    return true;
  }

  if (!config?.promoterRoleId) {
    return true;
  }

  return member.roles?.cache?.has(config.promoterRoleId) || false;
}

module.exports = {
  canSendPartnership,
  hasAdminPermission,
};
