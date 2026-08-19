const { SlashCommandBuilder, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { getSettings } = require('../../utils/guildSettings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('modifyembed')
    .setDescription('Edit an embed previously sent by the bot')
    .addStringOption(o => o.setName('message_id').setDescription('ID of the message containing the embed').setRequired(true))
    .addChannelOption(o => o.setName('channel').setDescription('Channel the message is in (defaults to current)'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  async execute(interaction) {
    const messageId = interaction.options.getString('message_id');
    const channel = interaction.options.getChannel('channel') || interaction.channel;

    // Store channel + message id in customId
    const modal = new ModalBuilder()
      .setCustomId(`embed_modify_${channel.id}_${messageId}`)
      .setTitle('Modify Embed');

    const titleInput = new TextInputBuilder()
      .setCustomId('title')
      .setLabel('New Title (leave empty to keep)')
      .setStyle(TextInputStyle.Short)
      .setRequired(false)
      .setMaxLength(256);

    const descriptionInput = new TextInputBuilder()
      .setCustomId('description')
      .setLabel('New Description (leave empty to keep)')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(false)
      .setMaxLength(4000);

    const colorInput = new TextInputBuilder()
      .setCustomId('color')
      .setLabel('New Color (hex, e.g. #5865F2)')
      .setStyle(TextInputStyle.Short)
      .setRequired(false);

    const footerInput = new TextInputBuilder()
      .setCustomId('footer')
      .setLabel('New Footer (leave empty to keep)')
      .setStyle(TextInputStyle.Short)
      .setRequired(false)
      .setMaxLength(2048);

    const imageInput = new TextInputBuilder()
      .setCustomId('image')
      .setLabel('New Image URL (leave empty to keep)')
      .setStyle(TextInputStyle.Short)
      .setRequired(false);

    modal.addComponents(
      new ActionRowBuilder().addComponents(titleInput),
      new ActionRowBuilder().addComponents(descriptionInput),
      new ActionRowBuilder().addComponents(colorInput),
      new ActionRowBuilder().addComponents(footerInput),
      new ActionRowBuilder().addComponents(imageInput)
    );

    await interaction.showModal(modal);
  }
};
