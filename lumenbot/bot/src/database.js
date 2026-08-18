const mysql = require('mysql2/promise');
const config = require('./config');

let pool = null;

async function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: config.mysql.host,
      port: config.mysql.port,
      user: config.mysql.user,
      password: config.mysql.password,
      database: config.mysql.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  }
  return pool;
}

async function query(sql, params = []) {
  const p = await getPool();
  const [rows] = await p.execute(sql, params);
  return rows;
}

async function isGuildWaitlisted(guildId) {
  const rows = await query('SELECT waitlisted FROM guilds WHERE guild_id = ?', [guildId]);
  if (rows.length === 0) return false;
  return !!rows[0].waitlisted;
}

async function ensureGuild(guild) {
  await query(
    `INSERT INTO guilds (guild_id, name, waitlisted) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE name = VALUES(name)`,
    [guild.id, guild.name, config.preWaitlisted.includes(guild.id) ? 1 : 0]
  );
}

async function getGuildSettings(guildId) {
  const rows = await query('SELECT * FROM guilds WHERE guild_id = ?', [guildId]);
  return rows[0] || null;
}

async function setGuildWaitlisted(guildId, value) {
  await query('UPDATE guilds SET waitlisted = ? WHERE guild_id = ?', [value ? 1 : 0, guildId]);
}

module.exports = {
  getPool,
  query,
  isGuildWaitlisted,
  ensureGuild,
  getGuildSettings,
  setGuildWaitlisted
};
