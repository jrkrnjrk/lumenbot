const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database');
const { getSettings } = require('../../utils/guildSettings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('modmail-unban')
    .setDescription('Remove a user from the modmail ban list')
    .addUserOption(o => o.setName('user').setDescription('User to unban from modmail').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const settings = await getSettings(interaction.guildId);
    const user = interaction.options.getUser('user');

    await db.query('DELETE FROM modmail_bans WHERE guild_id = ? AND user_id = ?', [interaction.guildId, user.id]);
    await interaction.reply(`${settings.emojiSuccess} **${user.tag}** can now create modmail tickets again.`);
  }
};
