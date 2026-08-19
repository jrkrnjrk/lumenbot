const { SlashCommandBuilder } = require('discord.js');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leave-server')
    .setDescription('Make the bot leave a server without changing whitelist status (Owner only)')
    .addStringOption(o => o.setName('guildid').setDescription('Guild ID').setRequired(true)),
  async execute(interaction, client) {
    if (!config.ownerIds.includes(interaction.user.id)) {
      return interaction.reply({ content: `${config.emojiError} Owner only.`, ephemeral: true });
    }
    const guildId = interaction.options.getString('guildid');
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      return interaction.reply({ content: `${config.emojiError} Bot is not in that server.`, ephemeral: true });
    }
    await guild.leave();
    await interaction.reply(`${config.emojiSuccess} Left the server.`);
  }
};
