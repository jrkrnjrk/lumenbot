const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reactionroleadd')
    .setDescription('Add a reaction role to a message')
    .addStringOption(o => o.setName('messageid').setDescription('Message ID').setRequired(true))
    .addRoleOption(o => o.setName('role').setDescription('Role to give').setRequired(true))
    .addStringOption(o => o.setName('emoji').setDescription('Emoji to react with').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
  async execute(interaction) {
    const messageId = interaction.options.getString('messageid');
    const role = interaction.options.getRole('role');
    const emoji = interaction.options.getString('emoji');

    const channel = interaction.channel;
    const message = await channel.messages.fetch(messageId).catch(() => null);
    if (!message) {
      return interaction.reply({ content: `${config.emojiError} Message not found in this channel.`, ephemeral: true });
    }

    try {
      await message.react(emoji);
      await db.query(
        `INSERT INTO reaction_roles (guild_id, message_id, channel_id, emoji, role_id)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE role_id = VALUES(role_id)`,
        [interaction.guildId, messageId, channel.id, emoji, role.id]
      );
      await interaction.reply(`${config.emojiSuccess} Reaction role added.`);
    } catch (e) {
      await interaction.reply({ content: `${config.emojiError} Failed: ${e.message}`, ephemeral: true });
    }
  }
};
