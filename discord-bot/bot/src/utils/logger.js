const { EmbedBuilder } = require('discord.js');
const db = require('../database');

async function getLogConfig(guildId) {
  const g = await db.getGuildSettings(guildId);
  if (!g) return null;
  let logging = { mod: true, member: true, message: true };
  try {
    if (g.logging) logging = typeof g.logging === 'string' ? JSON.parse(g.logging) : g.logging;
  } catch {}
  return {
    mod: g.log_mod_channel,
    member: g.log_member_channel || g.log_mod_channel,
    message: g.log_message_channel || g.log_mod_channel,
    enabled: logging
  };
}

async function sendLog(guild, channelId, embed) {
  if (!channelId || !guild) return;
  try {
    const ch = await guild.channels.fetch(channelId).catch(() => null);
    if (ch && ch.isTextBased()) await ch.send({ embeds: [embed] });
  } catch (e) {
    console.error('[Log]', e.message);
  }
}

async function logMod(guild, { action, target, moderator, reason, extra }) {
  const cfg = await getLogConfig(guild.id);
  if (!cfg?.mod || cfg.enabled?.mod === false) return;

  const embed = new EmbedBuilder()
    .setTitle(`Moderation · ${action}`)
    .setColor(actionColors[action] || 0x5865F2)
    .addFields(
      { name: 'User', value: target ? `${target.tag || target} (\`${target.id || target}\`)` : 'Unknown', inline: true },
      { name: 'Moderator', value: moderator ? `${moderator.tag} (\`${moderator.id}\`)` : 'System', inline: true },
      { name: 'Reason', value: reason || 'No reason provided' }
    )
    .setTimestamp();
  if (extra) embed.addFields({ name: 'Details', value: extra });
  await sendLog(guild, cfg.mod, embed);
}

async function logMember(guild, { title, description, color, fields }) {
  const cfg = await getLogConfig(guild.id);
  if (!cfg?.member || cfg.enabled?.member === false) return;

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(description || null)
    .setColor(color || 0x57F287)
    .setTimestamp();
  if (fields) fields.forEach(f => embed.addFields(f));
  await sendLog(guild, cfg.member, embed);
}

async function logMessage(guild, { title, description, color, fields }) {
  const cfg = await getLogConfig(guild.id);
  if (!cfg?.message || cfg.enabled?.message === false) return;

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(description || null)
    .setColor(color || 0xFEE75C)
    .setTimestamp();
  if (fields) fields.forEach(f => embed.addFields(f));
  await sendLog(guild, cfg.message, embed);
}

const actionColors = {
  ban: 0xED4245,
  softban: 0xED4245,
  kick: 0xE67E22,
  mute: 0xFEE75C,
  unmute: 0x57F287,
  warn: 0xFEE75C,
  unban: 0x57F287
};

module.exports = { logMod, logMember, logMessage, getLogConfig };
