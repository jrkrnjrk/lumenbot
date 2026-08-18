const { Events } = require('discord.js');
const db = require('../database');
const config = require('../config');

module.exports = {
  name: Events.MessageReactionAdd,
  async execute(reaction, user, client) {
    if (user.bot) return;
    if (reaction.partial) {
      try { await reaction.fetch(); } catch { return; }
    }

    const emoji = reaction.emoji.id ? `<:${reaction.emoji.name}:${reaction.emoji.id}>` : reaction.emoji.name;
    const rows = await db.query(
      'SELECT role_id FROM reaction_roles WHERE message_id = ? AND (emoji = ? OR emoji = ?)',
      [reaction.message.id, emoji, reaction.emoji.name]
    );
    if (rows.length === 0) return;

    const guild = reaction.message.guild;
    const member = await guild.members.fetch(user.id).catch(() => null);
    if (!member) return;

    try {
      await member.roles.add(rows[0].role_id);
    } catch (e) {
      console.error('Failed to add reaction role:', e.message);
    }
  }
};
