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

async function isGuildWhitelisted(guildId) {
  if (config.preWhitelisted.includes(String(guildId))) return true;
  const rows = await query('SELECT whitelisted, waitlisted FROM guilds WHERE guild_id = ?', [guildId]);
  if (rows.length === 0) return false;
  return !!(rows[0].whitelisted || rows[0].waitlisted);
}

async function ensureGuild(guild) {
  const pre = config.preWhitelisted.includes(String(guild.id)) ? 1 : 0;
  await query(
    `INSERT INTO guilds (guild_id, name, whitelisted, waitlisted) VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE name = VALUES(name),
       whitelisted = IF(VALUES(whitelisted) = 1, 1, whitelisted),
       waitlisted = IF(VALUES(waitlisted) = 1, 1, waitlisted)`,
    [guild.id, guild.name, pre, pre]
  );
}

async function getGuildSettings(guildId) {
  const rows = await query('SELECT * FROM guilds WHERE guild_id = ?', [guildId]);
  return rows[0] || null;
}

async function setGuildWhitelisted(guildId, value) {
  const v = value ? 1 : 0;
  await query(
    `INSERT INTO guilds (guild_id, whitelisted, waitlisted) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE whitelisted = ?, waitlisted = ?`,
    [guildId, v, v, v, v]
  );
}

module.exports = {
  getPool,
  query,
  isGuildWhitelisted,
  isGuildWaitlisted: isGuildWhitelisted,
  ensureGuild,
  getGuildSettings,
  setGuildWhitelisted,
  setGuildWaitlisted: setGuildWhitelisted
};
