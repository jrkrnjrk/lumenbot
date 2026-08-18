const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database');
const config = require('../../config');
const { addInfraction } = require('../../utils/infractions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('softban')
    .setDescription('Softban a member (ban + unban to delete messages)')
    .addUserOption(o => o.setName('user').setDescription('User to softban').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason'))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'Softban';

    const settings = await db.getGuildSettings(interaction.guildId);
    if (settings?.dm_before_mod) {
      try {
        await user.send(`You were softbanned from **${interaction.guild.name}**.\nReason: ${reason}`);
      } catch {}
    }

    await interaction.guild.members.ban(user.id, { reason, deleteMessageSeconds: 60 * 60 * 24 * 7 });
    await interaction.guild.members.unban(user.id, 'Softban complete');
    await addInfraction(interaction.guildId, user.id, interaction.user.id, 'softban', reason);
    await interaction.reply(`${config.emojiSuccess} Softbanned **${user.tag}**.`);
  }
};
