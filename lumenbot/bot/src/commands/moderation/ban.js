const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a member')
    .addUserOption(o => o.setName('user').setDescription('User to ban').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason'))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    const settings = await db.getGuildSettings(interaction.guildId);
    if (settings?.dm_before_mod) {
      try {
        await user.send(`You were banned from **${interaction.guild.name}**.\nReason: ${reason}`);
      } catch {}
    }

    await interaction.guild.members.ban(user.id, { reason });
    await interaction.reply(`${config.emojiSuccess} Banned **${user.tag}**. Reason: ${reason}`);
  }
};
