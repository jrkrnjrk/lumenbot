const { SlashCommandBuilder } = require('discord.js');
const db = require('../../database');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('disallow-server')
    .setDescription('Remove a server from the whitelist and leave it (Owner only)')
    .addStringOption(o => o.setName('guildid').setDescription('Guild ID').setRequired(true)),
  async execute(interaction, client) {
    if (!config.ownerIds.includes(interaction.user.id)) {
      return interaction.reply({ content: `${config.emojiError} Owner only.`, ephemeral: true });
    }
    const guildId = interaction.options.getString('guildid');
    await db.setGuildWhitelisted(guildId, false);
    const guild = client.guilds.cache.get(guildId);
    if (guild) {
      await guild.leave();
      await interaction.reply(`${config.emojiSuccess} Removed from whitelist and left the server.`);
    } else {
      await interaction.reply(`${config.emojiSuccess} Removed from whitelist (bot was not in the server).`);
    }
  }
};
