const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('modmail-ban')
    .setDescription('Ban a user from creating modmail tickets')
    .addUserOption(o => o.setName('user').setDescription('User to ban').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason';
    await db.query(
      `INSERT INTO modmail_bans (guild_id, user_id, reason, banned_by) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE reason = VALUES(reason)`,
      [interaction.guildId, user.id, reason, interaction.user.id]
    );
    await interaction.reply(`${config.emojiSuccess} **${user.tag}** is now banned from modmail.`);
  }
};
