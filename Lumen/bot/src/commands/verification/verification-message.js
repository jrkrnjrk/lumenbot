const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('verification-message')
    .setDescription('Send a customizable verification embed with a button')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction) {
    // Simple version: send a default embed. For full modal editing you can expand this.
    const embed = new EmbedBuilder()
      .setTitle('Verify your Roblox Account')
      .setDescription('Click the button below to start the verification process and link your Roblox account.')
      .setColor(0x00A2FF)
      .setFooter({ text: 'Roblox Verification System' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('verify_button')
        .setLabel('Verify')
        .setStyle(ButtonStyle.Success)
        .setEmoji('✅')
    );

    await interaction.channel.send({ embeds: [embed], components: [row] });
    await interaction.reply({ content: `${config.emojiSuccess} Verification message sent.`, ephemeral: true });
  },

  async handleButton(interaction, client) {
    // Redirect to the verify flow
    const verifyCmd = client.commands.get('verify');
    if (verifyCmd) {
      // Simulate running /verify for the user
      await interaction.reply({ content: 'Starting verification...', ephemeral: true });
      // You can call the same logic here
    }
  }
};
