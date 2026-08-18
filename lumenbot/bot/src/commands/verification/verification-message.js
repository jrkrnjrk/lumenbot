const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('verification-message')
    .setDescription('Send a verification panel with a button')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('Verify your Roblox Account')
      .setDescription('Click the button below to start the verification process and link your Roblox account.')
      .setColor(0x00A2FF)
      .setFooter({ text: 'Roblox Verification' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('verify_start')
        .setLabel('Verify')
        .setStyle(ButtonStyle.Success)
        .setEmoji('✅')
    );

    await interaction.channel.send({ embeds: [embed], components: [row] });
    await interaction.reply({ content: `${config.emojiSuccess || '✅'} Verification panel sent.`, ephemeral: true });
  }
};
