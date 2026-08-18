const { SlashCommandBuilder } = require('discord.js');
const db = require('../../database');
const { getVerifiedRole, getSettings } = require('../../utils/guildSettings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unlink')
    .setDescription('Unlink your Roblox account from the bot'),
  async execute(interaction) {
    const settings = await getSettings(interaction.guildId);

    await db.query(
      'UPDATE users SET roblox_id = NULL, roblox_username = NULL, verified_at = NULL WHERE discord_id = ?',
      [interaction.user.id]
    );

    // Remove verified role (from dashboard setting)
    const role = await getVerifiedRole(interaction.guild);
    if (role && interaction.member.roles.cache.has(role.id)) {
      await interaction.member.roles.remove(role).catch(() => {});
    }

    await interaction.reply({
      content: `${settings.emojiSuccess} Your Roblox account has been unlinked.`,
      ephemeral: true
    });
  }
};
