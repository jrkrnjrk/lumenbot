const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getSettings } = require('../../utils/guildSettings');
const { logMod } = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Unban a user by ID or username')
    .addStringOption(o => o.setName('userid').setDescription('User ID to unban').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason'))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction) {
    const settings = await getSettings(interaction.guildId);
    const userId = interaction.options.getString('userid').trim();
    const reason = interaction.options.getString('reason') || 'Unbanned by moderator';

    try {
      await interaction.guild.members.unban(userId, reason);
      await logMod(interaction.guild, { action: 'unban', target: { tag: userId, id: userId }, moderator: interaction.user, reason });
      await interaction.reply(`${settings.emojiSuccess} Unbanned \`${userId}\`.`);
    } catch (e) {
      await interaction.reply({ content: `${settings.emojiError} Could not unban. Check the ID or if they are banned.`, ephemeral: true });
    }
  }
};
