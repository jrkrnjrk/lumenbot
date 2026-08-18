require('dotenv').config();

module.exports = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.DISCORD_CLIENT_ID,
  ownerIds: (process.env.OWNER_IDS || '').split(',').map(id => id.trim()).filter(Boolean),
  preWaitlisted: (process.env.PRE_WAITLISTED_GUILDS || '').split(',').map(id => id.trim()).filter(Boolean),
  emojiSuccess: process.env.EMOJI_SUCCESS || '✅',
  emojiError: process.env.EMOJI_ERROR || '❌',
  modmailCategoryName: process.env.MODMAIL_CATEGORY_NAME || 'Modmail',
  verifiedRoleName: process.env.VERIFIED_ROLE_NAME || 'Verified',
  robloxCookie: process.env.ROBLOX_COOKIE,
  defaultGroupId: process.env.DEFAULT_GROUP_ID,
  mysql: {
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER || 'botuser',
    password: process.env.MYSQL_PASSWORD || 'strongpassword',
    database: process.env.MYSQL_DATABASE || 'discordbot',
  }
};
