const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database');
const { getSettings } = require('../../utils/guildSettings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Unmute a member')
    .addUserOption(o => o.setName('user').setDescription('User to unmute').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const settings = await getSettings(interaction.guildId);
    const user = interaction.options.getUser('user');
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) return interaction.reply({ content: `${settings.emojiError} User not in server.`, ephemeral: true });

    const guildSettings = await db.getGuildSettings(interaction.guildId);
    const mutedRoleId = guildSettings?.muted_role_id;
    if (!mutedRoleId) {
      return interaction.reply({ content: `${settings.emojiError} No Muted role configured.`, ephemeral: true });
    }

    if (member.roles.cache.has(mutedRoleId)) {
      await member.roles.remove(mutedRoleId, 'Unmuted by moderator');
    }
    await db.query('DELETE FROM mutes WHERE guild_id = ? AND user_id = ?', [interaction.guildId, user.id]);

    await interaction.reply(`${settings.emojiSuccess} Unmuted **${user.tag}**.`);
  }
};
