const { SlashCommandBuilder, ActivityType } = require('discord.js');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('Change the bot status (Owner only)')
    .addStringOption(o =>
      o.setName('text')
        .setDescription('The status text (or "reset" to resume rotation)')
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName('type')
        .setDescription('Activity type')
        .addChoices(
          { name: 'Playing', value: 'Playing' },
          { name: 'Watching', value: 'Watching' },
          { name: 'Listening', value: 'Listening' },
          { name: 'Competing', value: 'Competing' }
        )
    ),
  async execute(interaction, client) {
    if (!config.ownerIds.includes(interaction.user.id)) {
      return interaction.reply({ content: '❌ Owner only.', ephemeral: true });
    }

    const text = interaction.options.getString('text');
    const typeName = interaction.options.getString('type') || 'Playing';
    const typeMap = {
      Playing: ActivityType.Playing,
      Watching: ActivityType.Watching,
      Listening: ActivityType.Listening,
      Competing: ActivityType.Competing
    };

    // Reset → resume automatic rotation
    if (text.toLowerCase() === 'reset') {
      client.customStatus = null;
      // Restart rotation
      if (client.statusInterval) clearInterval(client.statusInterval);
      const rotatingStatuses = [
        { text: 'I love the moon', type: ActivityType.Playing },
        { text: 'DM ME TO CONTACT AN ADMIN!', type: ActivityType.Playing }
      ];
      let i = 0;
      client.user.setActivity(rotatingStatuses[0].text, { type: rotatingStatuses[0].type });
      client.statusInterval = setInterval(() => {
        if (client.customStatus) return;
        i = (i + 1) % rotatingStatuses.length;
        client.user.setActivity(rotatingStatuses[i].text, { type: rotatingStatuses[i].type });
      }, 30_000);
      return interaction.reply({ content: '✅ Status rotation resumed.', ephemeral: true });
    }

    // Custom status
    if (client.statusInterval) {
      clearInterval(client.statusInterval);
      client.statusInterval = null;
    }
    client.customStatus = { text, type: typeMap[typeName] };
    client.user.setActivity(text, { type: typeMap[typeName] });

    await interaction.reply({ content: `✅ Status set to **${typeName} ${text}**\nUse \`/status text:reset\` to resume rotation.`, ephemeral: true });
  }
};
