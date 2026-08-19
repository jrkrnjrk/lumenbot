const db = require('../database');

async function migrate() {
  const alters = [
    "ALTER TABLE guilds ADD COLUMN log_mod_channel VARCHAR(20) NULL",
    "ALTER TABLE guilds ADD COLUMN log_member_channel VARCHAR(20) NULL",
    "ALTER TABLE guilds ADD COLUMN log_message_channel VARCHAR(20) NULL",
    "ALTER TABLE guilds ADD COLUMN logging JSON NULL",
    "ALTER TABLE guilds ADD COLUMN muted_role_id VARCHAR(20) NULL",
    "ALTER TABLE guilds ADD COLUMN verified_role_id VARCHAR(20) NULL",
    "ALTER TABLE guilds ADD COLUMN modmail_category_id VARCHAR(20) NULL",
    "ALTER TABLE guilds ADD COLUMN emoji_success VARCHAR(100) NULL",
    "ALTER TABLE guilds ADD COLUMN emoji_error VARCHAR(100) NULL",
    "ALTER TABLE guilds ADD COLUMN automod JSON NULL",
    "ALTER TABLE guilds ADD COLUMN dm_before_mod BOOLEAN DEFAULT TRUE",
    "ALTER TABLE guilds ADD COLUMN modmail_enabled BOOLEAN DEFAULT TRUE",
    "ALTER TABLE guilds ADD COLUMN plugins JSON NULL",
    "ALTER TABLE guilds ADD COLUMN whitelisted BOOLEAN DEFAULT FALSE",
    "ALTER TABLE guilds ADD COLUMN waitlisted BOOLEAN DEFAULT FALSE",
    "ALTER TABLE guilds ADD COLUMN name VARCHAR(255) NULL",
  ];

  for (const sql of alters) {
    try {
      await db.query(sql);
    } catch (err) {
      // ignore duplicate column
    }
  }

  // Copy waitlisted -> whitelisted if old column exists
  try {
    await db.query('UPDATE guilds SET whitelisted = waitlisted WHERE whitelisted = 0 OR whitelisted IS NULL');
  } catch {}

  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS infractions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        guild_id VARCHAR(20) NOT NULL,
        user_id VARCHAR(20) NOT NULL,
        moderator_id VARCHAR(20),
        type VARCHAR(20) NOT NULL,
        reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user (guild_id, user_id)
      )
    `);
  } catch {}

  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS mutes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        guild_id VARCHAR(20) NOT NULL,
        user_id VARCHAR(20) NOT NULL,
        moderator_id VARCHAR(20),
        reason TEXT,
        expires_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch {}

  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS custom_commands (
        id INT AUTO_INCREMENT PRIMARY KEY,
        guild_id VARCHAR(20) NOT NULL,
        name VARCHAR(50) NOT NULL,
        response TEXT NOT NULL,
        created_by VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_cmd (guild_id, name)
      )
    `);
  } catch {}

  
  try {
    await db.query("ALTER TABLE dashboard_users ADD COLUMN guild_id VARCHAR(20) NULL");
  } catch {}

  console.log('[Migrate] Database schema is up to date');
}

module.exports = { migrate };
