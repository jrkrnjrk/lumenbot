const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database');
const { getSettings } = require('../../utils/guildSettings');
const { addInfraction } = require('../../utils/infractions');

function parseDuration(str) {
  if (!str) return null;
  const match = String(str).match(/^(\d+)(s|m|h|d)$/i);
  if (!match) return null;
  const num = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return num * (multipliers[unit] || 0) || null;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Mute a member for a duration')
    .addUserOption(o => o.setName('user').setDescription('User to mute').setRequired(true))
    .addStringOption(o => o.setName('duration').setDescription('e.g. 10m, 1h, 1d (empty = permanent)').setRequired(false))
    .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const settings = await getSettings(interaction.guildId);
    const user = interaction.options.getUser('user');
    const durationStr = interaction.options.getString('duration');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) {
      return interaction.reply({ content: `${settings.emojiError} User not in this server.`, ephemeral: true });
    }
    if (!member.moderatable) {
      return interaction.reply({ content: `${settings.emojiError} I cannot mute this user (role hierarchy).`, ephemeral: true });
    }

    const guildSettings = await db.getGuildSettings(interaction.guildId);
    const mutedRoleId = guildSettings?.muted_role_id;
    if (!mutedRoleId) {
      return interaction.reply({
        content: `${settings.emojiError} No Muted role set. Set it in the dashboard first.`,
        ephemeral: true
      });
    }

    const role = interaction.guild.roles.cache.get(mutedRoleId);
    if (!role) {
      return interaction.reply({
        content: `${settings.emojiError} Muted role ID is invalid. Re-set it in the dashboard.`,
        ephemeral: true
      });
    }

    if (member.roles.cache.has(mutedRoleId)) {
      return interaction.reply({ content: `${settings.emojiError} User is already muted.`, ephemeral: true });
    }

    const ms = parseDuration(durationStr);
    let expiresAt = ms ? new Date(Date.now() + ms) : null;

    if (guildSettings?.dm_before_mod) {
      try {
        await user.send(
          `You were muted in **${interaction.guild.name}**.\n` +
          `Duration: ${durationStr || 'Permanent'}\nReason: ${reason}`
        );
      } catch {}
    }

    await member.roles.add(role, reason);
    await addInfraction(interaction.guildId, user.id, interaction.user.id, 'mute', reason + (durationStr ? ` (${durationStr})` : ''));

    await db.query(
      `INSERT INTO mutes (guild_id, user_id, moderator_id, reason, expires_at) VALUES (?, ?, ?, ?, ?)`,
      [interaction.guildId, user.id, interaction.user.id, reason, expiresAt]
    );

    if (ms) {
      setTimeout(async () => {
        try {
          const m = await interaction.guild.members.fetch(user.id).catch(() => null);
          if (m && m.roles.cache.has(mutedRoleId)) {
            await m.roles.remove(mutedRoleId, 'Mute expired');
          }
          await db.query('DELETE FROM mutes WHERE guild_id = ? AND user_id = ?', [interaction.guildId, user.id]);
        } catch {}
      }, ms);
    }

    await interaction.reply(
      `${settings.emojiSuccess} Muted **${user.tag}**` +
      (durationStr ? ` for **${durationStr}**` : ' permanently') +
      `. Reason: ${reason}`
    );
  }
};
