const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database');
const { getSettings } = require('../../utils/guildSettings');

function parseDuration(str) {
  if (!str) return null;
  const match = str.match(/^(\d+)(s|m|h|d)$/i);
  if (!match) return null;
  const num = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return num * multipliers[unit];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Mute a member for a duration')
    .addUserOption(o => o.setName('user').setDescription('User to mute').setRequired(true))
    .addStringOption(o => o.setName('duration').setDescription('e.g. 10m, 1h, 1d (leave empty for permanent)').setRequired(false))
    .addStringOption(o => o.setName('reason').setDescription('Reason'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const settings = await getSettings(interaction.guildId);
    const user = interaction.options.getUser('user');
    const durationStr = interaction.options.getString('duration');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) return interaction.reply({ content: `${settings.emojiError} User not in server.`, ephemeral: true });
    if (!member.moderatable) return interaction.reply({ content: `${settings.emojiError} I cannot mute this user.`, ephemeral: true });

    const guildSettings = await db.getGuildSettings(interaction.guildId);
    const mutedRoleId = guildSettings?.muted_role_id;
    if (!mutedRoleId) {
      return interaction.reply({ content: `${settings.emojiError} No Muted role set. Configure it in the dashboard.`, ephemeral: true });
    }

    const role = interaction.guild.roles.cache.get(mutedRoleId);
    if (!role) {
      return interaction.reply({ content: `${settings.emojiError} Muted role not found. Re-set it in the dashboard.`, ephemeral: true });
    }

    const ms = parseDuration(durationStr);
    let expiresAt = null;
    if (ms) expiresAt = new Date(Date.now() + ms);

    // DM before mod if enabled
    if (guildSettings?.dm_before_mod) {
      try {
        await user.send(`You were muted in **${interaction.guild.name}**.\nDuration: ${durationStr || 'Permanent'}\nReason: ${reason}`);
      } catch {}
    }

    await member.roles.add(role, reason);

    await db.query(
      `INSERT INTO mutes (guild_id, user_id, moderator_id, reason, expires_at) VALUES (?, ?, ?, ?, ?)`,
      [interaction.guildId, user.id, interaction.user.id, reason, expiresAt]
    );

    // Schedule unmute if temporary
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

    await interaction.reply(`${settings.emojiSuccess} Muted **${user.tag}** ${durationStr ? `for **${durationStr}**` : 'permanently'}. Reason: ${reason}`);
  }
};
