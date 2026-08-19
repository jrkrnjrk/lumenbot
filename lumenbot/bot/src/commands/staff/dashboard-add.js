const { SlashCommandBuilder } = require('discord.js');
const db = require('../../database');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dashboard-add')
    .setDescription('Grant dashboard access to a user (Owner only)')
    .addUserOption(o => o.setName('user').setDescription('User to add').setRequired(true))
    .addStringOption(o =>
      o.setName('serverid')
        .setDescription('Optional: limit access to this server ID only (leave empty for all servers)')
        .setRequired(false)
    ),

  async execute(interaction) {
    if (!config.ownerIds.includes(interaction.user.id)) {
      return interaction.reply({ content: `${config.emojiError} Owner only.`, ephemeral: true });
    }
    const user = interaction.options.getUser('user');
    const serverId = interaction.options.getString('serverid')?.trim() || null;

    // Ensure guild_id column exists
    try {
      await db.query('ALTER TABLE dashboard_users ADD COLUMN guild_id VARCHAR(20) NULL');
    } catch {}

    if (serverId) {
      await db.query(
        `INSERT INTO dashboard_users (discord_id, username, added_by, guild_id) VALUES (?, ?, ?, ?)`,
        [user.id, user.tag, interaction.user.id, serverId]
      );
      await interaction.reply(
        `${config.emojiSuccess} **${user.tag}** can access the dashboard for server \`${serverId}\` only.`
      );
    } else {
      await db.query(
        `INSERT INTO dashboard_users (discord_id, username, added_by, guild_id) VALUES (?, ?, ?, NULL)
         ON DUPLICATE KEY UPDATE username = VALUES(username)`,
        [user.id, user.tag, interaction.user.id]
      );
      await interaction.reply(
        `${config.emojiSuccess} **${user.tag}** can access the dashboard for **all** whitelisted servers (if they are admin/owner on them).`
      );
    }
  }
};
