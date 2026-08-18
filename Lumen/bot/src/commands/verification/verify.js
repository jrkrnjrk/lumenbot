const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('verify')
    .setDescription('Get a link to verify your Roblox account'),
  async execute(interaction) {
    // In a real implementation you would use a proper OAuth or RoVer-style code system.
    // Here we provide a simple placeholder flow using a verification code the user puts in their Roblox bio/status.
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    // Store code temporarily (in production use Redis or DB with expiry)
    // For demo we just tell the user.
    const embed = new EmbedBuilder()
      .setTitle('Roblox Verification')
      .setDescription(
        `To verify:\n1. Go to your Roblox profile and put this code in your **About / Description**:\n\`\`\`${code}\`\`\`\n2. Then click the button below.`
      )
      .setColor(0x00A2FF);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`verify_check_${code}`)
        .setLabel('I have added the code')
        .setStyle(ButtonStyle.Primary)
    );

    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  }
};
