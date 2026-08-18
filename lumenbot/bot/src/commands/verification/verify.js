const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getSettings } = require('../../utils/guildSettings');

// Temporary store for verification codes
const pendingCodes = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('verify')
    .setDescription('Link your Roblox account'),
  async execute(interaction) {
    const settings = await getSettings(interaction.guildId);
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();

    pendingCodes.set(interaction.user.id, {
      code,
      expires: Date.now() + 10 * 60 * 1000
    });

    const embed = new EmbedBuilder()
      .setTitle('Roblox Verification')
      .setDescription(
        `**Step 1:** Go to your Roblox profile → **About** section\n` +
        `**Step 2:** Put this code in your description:\n\`\`\`${code}\`\`\`\n` +
        `**Step 3:** Click the button below after you've saved it.`
      )
      .setColor(0x00A2FF)
      .setFooter({ text: 'Code expires in 10 minutes' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`verify_check_${interaction.user.id}`)
        .setLabel('I added the code')
        .setStyle(ButtonStyle.Success)
        .setEmoji('✅')
    );

    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  },

  pendingCodes
};
