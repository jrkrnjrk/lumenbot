const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reactionroledelete')
    .setDescription('Remove all reaction roles from a message')
    .addStringOption(o => o.setName('messageid').setDescription('Message ID').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
  async execute(interaction) {
    const messageId = interaction.options.getString('messageid');
    await db.query('DELETE FROM reaction_roles WHERE message_id = ?', [messageId]);
    await db.query('DELETE FROM button_roles WHERE message_id = ?', [messageId]);
    await interaction.reply(`${config.emojiSuccess} Reaction roles removed for that message.`);
  }
};
