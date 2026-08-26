const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getSettings } = require('../../utils/guildSettings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('modify')
    .setDescription('Edit a message previously sent by the bot')
    .addStringOption(o => o.setName('message_id').setDescription('ID of the message to edit').setRequired(true))
    .addStringOption(o => o.setName('new_content').setDescription('New message content').setRequired(true))
    .addChannelOption(o => o.setName('channel').setDescription('Channel the message is in (defaults to current)'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  async execute(interaction) {
    const settings = await getSettings(interaction.guildId);
    const messageId = interaction.options.getString('message_id');
    const newContent = interaction.options.getString('new_content');
    const channel = interaction.options.getChannel('channel') || interaction.channel;

    try {
      const message = await channel.messages.fetch(messageId);
      if (message.author.id !== interaction.client.user.id) {
        return interaction.reply({ content: `${settings.emojiError} That message was not sent by me.`, ephemeral: true });
      }
      await message.edit(newContent);
      await interaction.reply({ content: `${settings.emojiSuccess} Message updated.`, ephemeral: true });
    } catch (err) {
      await interaction.reply({ content: `${settings.emojiError} Failed: ${err.message}`, ephemeral: true });
    }
  }
};
