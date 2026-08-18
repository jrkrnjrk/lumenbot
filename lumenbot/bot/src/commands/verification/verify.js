const {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder
} = require('discord.js');

// pendingCodes: userId -> { code, robloxUsername, expires }
const pendingCodes = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('verify')
    .setDescription('Link your Roblox account'),

  pendingCodes,

  async execute(interaction) {
    // Step 1: Ask for Roblox username via modal
    const modal = new ModalBuilder()
      .setCustomId('verify_step1_username')
      .setTitle('Roblox Verification');

    const usernameInput = new TextInputBuilder()
      .setCustomId('roblox_username')
      .setLabel('Your exact Roblox username')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('e.g. Builderman')
      .setRequired(true)
      .setMaxLength(50);

    modal.addComponents(new ActionRowBuilder().addComponents(usernameInput));
    await interaction.showModal(modal);
  }
};
