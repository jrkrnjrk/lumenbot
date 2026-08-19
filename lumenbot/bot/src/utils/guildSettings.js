const db = require('../database');
const config = require('../config');

/**
 * Get effective settings for a guild (DB overrides .env defaults)
 */
async function getSettings(guildId) {
  const row = await db.getGuildSettings(guildId);
  return {
    verifiedRoleId: row?.verified_role_id || null,
    modmailCategoryId: row?.modmail_category_id || null,
    emojiSuccess: row?.emoji_success || config.emojiSuccess,
    emojiError: row?.emoji_error || config.emojiError,
    modmailEnabled: row?.modmail_enabled !== false && row?.modmail_enabled !== 0,
    dmBeforeMod: row?.dm_before_mod !== false && row?.dm_before_mod !== 0,
    plugins: (() => {
      try {
        return typeof row?.plugins === 'string' ? JSON.parse(row.plugins) : (row?.plugins || {});
      } catch {
        return {};
      }
    })()
  };
}

/**
 * Resolve the verified role for a guild (ID from dashboard, or fallback by name)
 */
async function getVerifiedRole(guild) {
  const settings = await getSettings(guild.id);
  if (settings.verifiedRoleId) {
    const role = guild.roles.cache.get(settings.verifiedRoleId);
    if (role) return role;
  }
  // Fallback: role named "Verified" (or whatever is in .env)
  return guild.roles.cache.find(r => r.name === config.verifiedRoleName) || null;
}

module.exports = {
  getSettings,
  getVerifiedRole
};
