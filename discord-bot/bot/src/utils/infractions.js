const db = require('../database');

async function addInfraction(guildId, userId, moderatorId, type, reason) {
  await db.query(
    `INSERT INTO infractions (guild_id, user_id, moderator_id, type, reason) VALUES (?, ?, ?, ?, ?)`,
    [guildId, userId, moderatorId, type, reason || 'No reason provided']
  );
}

async function getInfractions(guildId, userId) {
  return db.query(
    `SELECT * FROM infractions WHERE guild_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 50`,
    [guildId, userId]
  );
}

module.exports = { addInfraction, getInfractions };
