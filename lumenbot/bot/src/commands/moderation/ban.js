const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database');
const config = require('../../config');
const { addInfraction } = require('../../utils/infractions');
const { logMod } = require('../../utils/logger');

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
    .setName('ban')
    .setDescription('Ban a member (optional duration for temp ban)')
    .addUserOption(o => o.setName('user').setDescription('User to ban').setRequired(true))
    .addStringOption(o => o.setName('duration').setDescription('e.g. 1h, 1d, 7d (leave empty for permanent)'))
    .addStringOption(o => o.setName('reason').setDescription('Reason'))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const durationStr = interaction.options.getString('duration');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const ms = parseDuration(durationStr);

    const settings = await db.getGuildSettings(interaction.guildId);
    if (settings?.dm_before_mod) {
      try {
        await user.send(
          `You were banned from **${interaction.guild.name}**.\n` +
          `Duration: ${durationStr || 'Permanent'}\nReason: ${reason}`
        );
      } catch {}
    }

    await interaction.guild.members.ban(user.id, { reason });
    await addInfraction(interaction.guildId, user.id, interaction.user.id, 'ban', reason + (durationStr ? ` (${durationStr})` : ''));
    await logMod(interaction.guild, { action: 'ban', target: user, moderator: interaction.user, reason, extra: durationStr ? `Duration: ${durationStr}` : 'Permanent' });

    if (ms) {
      setTimeout(async () => {
        try {
          await interaction.guild.members.unban(user.id, 'Temporary ban expired');
        } catch {}
      }, ms);
    }

    await interaction.reply(
      `${config.emojiSuccess || '✅'} Banned **${user.tag}**` +
      (durationStr ? ` for **${durationStr}**` : ' permanently') +
      `. Reason: ${reason}`
    );
  }
};
