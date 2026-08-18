const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('verification-message')
    .setDescription('Create a customizable verification embed with a Verify button')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const modal = new ModalBuilder()
      .setCustomId('verification_embed_modal')
      .setTitle('Customize Verification Message');

    const titleInput = new TextInputBuilder()
      .setCustomId('embed_title')
      .setLabel('Embed Title')
      .setStyle(TextInputStyle.Short)
      .setValue('Verify your Roblox Account')
      .setRequired(true)
      .setMaxLength(256);

    const descriptionInput = new TextInputBuilder()
      .setCustomId('embed_description')
      .setLabel('Embed Description')
      .setStyle(TextInputStyle.Paragraph)
      .setValue('Click the button below to link your Roblox account and get the verified role.')
      .setRequired(true)
      .setMaxLength(4000);

    const colorInput = new TextInputBuilder()
      .setCustomId('embed_color')
      .setLabel('Embed Color (hex)')
      .setStyle(TextInputStyle.Short)
      .setValue('#00A2FF')
      .setRequired(false)
      .setMaxLength(7);

    const buttonLabelInput = new TextInputBuilder()
      .setCustomId('button_label')
      .setLabel('Button Text')
      .setStyle(TextInputStyle.Short)
      .setValue('Verify')
      .setRequired(true)
      .setMaxLength(80);

    modal.addComponents(
      new ActionRowBuilder().addComponents(titleInput),
      new ActionRowBuilder().addComponents(descriptionInput),
      new ActionRowBuilder().addComponents(colorInput),
      new ActionRowBuilder().addComponents(buttonLabelInput)
    );

    await interaction.showModal(modal);
  }
};
