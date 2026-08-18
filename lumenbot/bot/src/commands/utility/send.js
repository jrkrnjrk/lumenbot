const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getSettings } = require('../../utils/guildSettings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('send')
    .setDescription('Send a basic message as the bot')
    .addStringOption(o => o.setName('message').setDescription('The message to send').setRequired(true))
    .addChannelOption(o => o.setName('channel').setDescription('Channel to send in (defaults to current)'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  async execute(interaction) {
    const settings = await getSettings(interaction.guildId);
    const content = interaction.options.getString('message');
    const channel = interaction.options.getChannel('channel') || interaction.channel;

    try {
      await channel.send(content);
      await interaction.reply({ content: `${settings.emojiSuccess} Message sent in ${channel}.`, ephemeral: true });
    } catch (err) {
      await interaction.reply({ content: `${settings.emojiError} Failed to send: ${err.message}`, ephemeral: true });
    }
  }
};
