const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database');
const { getVerifiedRole, getSettings } = require('../../utils/guildSettings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('forceverify')
    .setDescription('Force verify a user and set their nickname')
    .addUserOption(o => o.setName('user').setDescription('Discord user').setRequired(true))
    .addStringOption(o => o.setName('robloxusername').setDescription('Roblox username').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
  async execute(interaction) {
    const settings = await getSettings(interaction.guildId);
    const user = interaction.options.getUser('user');
    const robloxName = interaction.options.getString('robloxusername');
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) {
      return interaction.reply({ content: `${settings.emojiError} User not in server.`, ephemeral: true });
    }

    await db.query(
      `INSERT INTO users (discord_id, roblox_username, verified_at) VALUES (?, ?, NOW())
       ON DUPLICATE KEY UPDATE roblox_username = VALUES(roblox_username), verified_at = NOW()`,
      [user.id, robloxName]
    );

    // Nickname
    try {
      await member.setNickname(robloxName);
    } catch {}

    // Verified role (from dashboard setting)
    const role = await getVerifiedRole(interaction.guild);
    if (role) {
      await member.roles.add(role).catch(() => {});
    }

    await interaction.reply(`${settings.emojiSuccess} Force-verified **${user.tag}** as **${robloxName}**.`);
  }
};
