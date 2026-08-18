const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setnickname')
    .setDescription('Change a member\'s nickname')
    .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
    .addStringOption(o => o.setName('nickname').setDescription('New nickname (leave empty to reset)').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames),
  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const nick = interaction.options.getString('nickname') || null;
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) return interaction.reply({ content: `${config.emojiError} User not found.`, ephemeral: true });

    try {
      await member.setNickname(nick);
      await interaction.reply(`${config.emojiSuccess} Nickname updated for **${user.tag}**.`);
    } catch (e) {
      await interaction.reply({ content: `${config.emojiError} Failed (check role hierarchy).`, ephemeral: true });
    }
  }
};
