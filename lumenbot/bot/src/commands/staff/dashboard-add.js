const { SlashCommandBuilder } = require('discord.js');
const db = require('../../database');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dashboard-add')
    .setDescription('Add a user to the dashboard access list (Owner only)')
    .addUserOption(o => o.setName('user').setDescription('User to add').setRequired(true)),
  async execute(interaction) {
    if (!config.ownerIds.includes(interaction.user.id)) {
      return interaction.reply({ content: `${config.emojiError} Owner only.`, ephemeral: true });
    }
    const user = interaction.options.getUser('user');
    await db.query(
      `INSERT INTO dashboard_users (discord_id, username, added_by) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE username = VALUES(username)`,
      [user.id, user.tag, interaction.user.id]
    );
    await interaction.reply(`${config.emojiSuccess} Added **${user.tag}** to dashboard access.`);
  }
};
