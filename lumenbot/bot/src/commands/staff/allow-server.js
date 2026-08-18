const { SlashCommandBuilder } = require('discord.js');
const db = require('../../database');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('allow-server')
    .setDescription('Add a server to the waitlist so the bot stays (Owner only)')
    .addStringOption(o => o.setName('guildid').setDescription('Guild ID').setRequired(true)),
  async execute(interaction) {
    if (!config.ownerIds.includes(interaction.user.id)) {
      return interaction.reply({ content: `${config.emojiError} Owner only.`, ephemeral: true });
    }
    const guildId = interaction.options.getString('guildid');
    await db.query(
      `INSERT INTO guilds (guild_id, waitlisted) VALUES (?, 1)
       ON DUPLICATE KEY UPDATE waitlisted = 1`,
      [guildId]
    );
    await interaction.reply(`${config.emojiSuccess} Server \`${guildId}\` is now waitlisted.`);
  }
};
