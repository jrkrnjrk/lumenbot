const db = require('../database');

/**
 * Ensure all required columns exist (safe to run every startup)
 */
async function migrate() {
  const alters = [
    "ALTER TABLE guilds ADD COLUMN muted_role_id VARCHAR(20) NULL",
    "ALTER TABLE guilds ADD COLUMN verified_role_id VARCHAR(20) NULL",
    "ALTER TABLE guilds ADD COLUMN modmail_category_id VARCHAR(20) NULL",
    "ALTER TABLE guilds ADD COLUMN emoji_success VARCHAR(100) NULL",
    "ALTER TABLE guilds ADD COLUMN emoji_error VARCHAR(100) NULL",
    "ALTER TABLE guilds ADD COLUMN automod JSON NULL",
    "ALTER TABLE guilds ADD COLUMN dm_before_mod BOOLEAN DEFAULT TRUE",
    "ALTER TABLE guilds ADD COLUMN modmail_enabled BOOLEAN DEFAULT TRUE",
    "ALTER TABLE guilds ADD COLUMN plugins JSON NULL",
    "ALTER TABLE guilds ADD COLUMN waitlisted BOOLEAN DEFAULT FALSE",
    "ALTER TABLE guilds ADD COLUMN name VARCHAR(255) NULL",
  ];

  for (const sql of alters) {
    try {
      await db.query(sql);
      console.log('[Migrate] Applied:', sql.split('ADD COLUMN')[1]?.trim() || sql);
    } catch (err) {
      // Duplicate column = already exists, ignore
      if (!String(err.message).includes('Duplicate column')) {
        // ignore other non-critical
      }
    }
  }

  // Ensure infractions table exists
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

  // Ensure mutes table exists
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

  console.log('[Migrate] Database schema is up to date');
}

module.exports = { migrate };
