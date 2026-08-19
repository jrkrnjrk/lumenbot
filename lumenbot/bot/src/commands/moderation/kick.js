const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database');
const config = require('../../config');
const { addInfraction } = require('../../utils/infractions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member')
    .addUserOption(o => o.setName('user').setDescription('User to kick').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason'))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) return interaction.reply({ content: `${config.emojiError} User not in server.`, ephemeral: true });
    if (!member.kickable) return interaction.reply({ content: `${config.emojiError} I cannot kick this user.`, ephemeral: true });

    const settings = await db.getGuildSettings(interaction.guildId);
    if (settings?.dm_before_mod) {
      try {
        await user.send(`You were kicked from **${interaction.guild.name}**.\nReason: ${reason}`);
      } catch {}
    }

    await member.kick(reason);
    await addInfraction(interaction.guildId, user.id, interaction.user.id, 'kick', reason);
    await interaction.reply(`${config.emojiSuccess} Kicked **${user.tag}**. Reason: ${reason}`);
  }
};
