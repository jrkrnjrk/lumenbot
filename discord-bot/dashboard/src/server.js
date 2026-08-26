require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const mysql = require('mysql2/promise');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.DASHBOARD_PORT || 3000;

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'mysql',
  user: process.env.MYSQL_USER || 'botuser',
  password: process.env.MYSQL_PASSWORD || 'strongpassword',
  database: process.env.MYSQL_DATABASE || 'discordbot',
  waitForConnections: true,
  connectionLimit: 5
});

async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

async function ensureSchema() {
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
    "ALTER TABLE guilds ADD COLUMN whitelisted BOOLEAN DEFAULT FALSE",
    "ALTER TABLE guilds ADD COLUMN name VARCHAR(255) NULL",
  ];
  for (const sql of alters) {
    try { await query(sql); } catch (e) { /* column exists */ }
  }
  try {
    await query(`CREATE TABLE IF NOT EXISTS infractions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      guild_id VARCHAR(20) NOT NULL,
      user_id VARCHAR(20) NOT NULL,
      moderator_id VARCHAR(20),
      type VARCHAR(20) NOT NULL,
      reason TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user (guild_id, user_id)
    )`);
  } catch {}
  try {
    await query(`CREATE TABLE IF NOT EXISTS mutes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      guild_id VARCHAR(20) NOT NULL,
      user_id VARCHAR(20) NOT NULL,
      moderator_id VARCHAR(20),
      reason TEXT,
      expires_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
  } catch {}
  try { await query("ALTER TABLE dashboard_users ADD COLUMN guild_id VARCHAR(20) NULL"); } catch {}
  try { await query("ALTER TABLE guilds ADD COLUMN log_mod_channel VARCHAR(20) NULL"); } catch {}
  try { await query("ALTER TABLE guilds ADD COLUMN log_member_channel VARCHAR(20) NULL"); } catch {}
  try { await query("ALTER TABLE guilds ADD COLUMN log_message_channel VARCHAR(20) NULL"); } catch {}
  try { await query("ALTER TABLE guilds ADD COLUMN logging JSON NULL"); } catch {}
  try { await query("ALTER TABLE guilds ADD COLUMN command_prefix VARCHAR(5) NULL"); } catch {}
  console.log('[Dashboard] Schema ready');
}


passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

passport.use(new DiscordStrategy({
  clientID: process.env.DISCORD_CLIENT_ID,
  clientSecret: process.env.DISCORD_CLIENT_SECRET,
  callbackURL: process.env.DISCORD_REDIRECT_URI || 'http://localhost:3000/auth/discord/callback',
  scope: ['identify', 'guilds']
}, (accessToken, refreshToken, profile, done) => {
  process.nextTick(() => done(null, profile));
}));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'change_me',
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

function ensureAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/login');
}

function isAdminOfAnyGuild(user) {
  if (!user || !user.guilds) return false;
  for (const g of user.guilds) {
    if (g.owner) return true;
    try {
      const perms = BigInt(g.permissions || 0);
      if ((perms & 0x8n) === 0x8n) return true; // ADMINISTRATOR
    } catch {}
  }
  return false;
}

async function canAccessDashboard(discordId, user) {
  const owners = (process.env.OWNER_IDS || '').split(',').map(s => s.trim());
  if (owners.includes(discordId)) return true;
  // Server owners/admins automatically have access
  if (user && isAdminOfAnyGuild(user)) return true;
  const rows = await query('SELECT 1 FROM dashboard_users WHERE discord_id = ?', [discordId]);
  return rows.length > 0;
}

app.get('/', (req, res) => {
  const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${process.env.DISCORD_CLIENT_ID}&permissions=8&scope=bot%20applications.commands`;
  res.render('home', { inviteUrl, user: req.user || null });
});

app.get('/docs', (req, res) => {
  res.render('docs');
});

app.get('/login', (req, res) => res.render('login'));

app.get('/auth/discord', passport.authenticate('discord'));
app.get('/auth/discord/callback',
  passport.authenticate('discord', { failureRedirect: '/login' }),
  async (req, res) => {
    const allowed = await canAccessDashboard(req.user.id, req.user);
    if (!allowed) {
      req.logout(() => {});
      return res.send('You do not have access to the dashboard. Ask an owner to run /dashboard-add');
    }
    res.redirect('/dashboard');
  }
);

app.get('/logout', (req, res) => {
  req.logout(() => res.redirect('/'));
});

app.get('/dashboard', ensureAuth, async (req, res) => {
  // Guilds from Discord OAuth where user is owner or has ADMINISTRATOR
  const ADMIN = 0x8n; // BigInt for permission bit
  const userGuilds = (req.user.guilds || []).filter(g => {
    if (g.owner) return true;
    try {
      const perms = BigInt(g.permissions || 0);
      return (perms & 0x8n) === 0x8n; // ADMINISTRATOR
    } catch {
      return false;
    }
  });
  const allowedIds = userGuilds.map(g => g.id);

  // Also allow if user is global owner or in dashboard_users for that guild / global
  const isGlobalOwner = (process.env.OWNER_IDS || '').split(',').map(s => s.trim()).includes(req.user.id);
  let dashRows = [];
  try {
    dashRows = await query('SELECT guild_id FROM dashboard_users WHERE discord_id = ?', [req.user.id]);
  } catch {}
  const dashGuildIds = dashRows.map(r => r.guild_id).filter(Boolean);
  const globalDash = dashRows.some(r => !r.guild_id);

  let guilds = [];
  if (isGlobalOwner || globalDash) {
    guilds = await query('SELECT * FROM guilds WHERE (whitelisted = 1 OR waitlisted = 1) ORDER BY name');
  } else {
    const ids = [...new Set([...allowedIds, ...dashGuildIds])];
    if (ids.length) {
      const placeholders = ids.map(() => '?').join(',');
      guilds = await query(
        `SELECT * FROM guilds WHERE (whitelisted = 1 OR waitlisted = 1) AND guild_id IN (${placeholders}) ORDER BY name`,
        ids
      );
    }
  }

  // Prefer Discord guild names when available
  const nameMap = Object.fromEntries(userGuilds.map(g => [g.id, g.name]));
  guilds = guilds.map(g => ({ ...g, name: nameMap[g.guild_id] || g.name || g.guild_id }));

  res.render('dashboard', { user: req.user, guilds });
});

app.get('/dashboard/:guildId', ensureAuth, async (req, res) => {
  const guild = (await query('SELECT * FROM guilds WHERE guild_id = ?', [req.params.guildId]))[0];
  if (!guild) return res.status(404).send('Guild not found');

  let plugins = {};
  try { plugins = typeof guild.plugins === 'string' ? JSON.parse(guild.plugins) : guild.plugins || {}; } catch {}

  let automod = { enabled: false, invites: true, badwords: true, websites: false, action: 'clear', ban_duration: '', mute_duration: '', badword_list: '' };
  try {
    automod = typeof guild.automod === 'string' ? JSON.parse(guild.automod) : (guild.automod || automod);
  } catch {}

  let logging = { mod: true, member: true, message: true };
  try { logging = typeof guild.logging === 'string' ? JSON.parse(guild.logging) : (guild.logging || logging); } catch {}
  res.render('guild', {
    user: req.user,
    guild,
    plugins,
    automod,
    logging,
    saved: req.query.saved === '1'
  });
});

app.get('/dashboard/:guildId/update', ensureAuth, (req, res) => {
  res.redirect(`/dashboard/${req.params.guildId}`);
});

app.post('/dashboard/:guildId/update', ensureAuth, async (req, res) => {
  const body = req.body;

  const plugins = {
    moderation: !!body.moderation,
    reactionroles: !!body.reactionroles,
    modmail: !!body.modmail,
    verification: !!body.verification,
    automod: !!body.automod,
    text_commands: !!body.text_commands
  };

  const automod = {
    enabled: !!body.automod_enabled,
    invites: !!body.automod_invites,
    badwords: !!body.automod_badwords,
    websites: !!body.automod_websites,
    action: body.automod_action || 'clear',
    ban_duration: body.automod_ban_duration?.trim() || '',
    mute_duration: body.automod_mute_duration?.trim() || '',
    badword_list: body.automod_badword_list || ''
  };

  try {
    await query(
      `UPDATE guilds SET 
        modmail_enabled = ?, 
        dm_before_mod = ?,
        plugins = ?,
        verified_role_id = ?,
        muted_role_id = ?,
        modmail_category_id = ?,
        emoji_success = ?,
        emoji_error = ?,
        automod = ?,
        log_mod_channel = ?,
        log_member_channel = ?,
        log_message_channel = ?,
        logging = ?,
        command_prefix = ?
       WHERE guild_id = ?`,
      [
        body.modmail_enabled === 'on' ? 1 : 0,
        body.dm_before_mod === 'on' ? 1 : 0,
        JSON.stringify(plugins),
        body.verified_role_id?.trim() || null,
        body.muted_role_id?.trim() || null,
        body.modmail_category_id?.trim() || null,
        body.emoji_success?.trim() || null,
        body.emoji_error?.trim() || null,
        JSON.stringify(automod),
        body.log_mod_channel?.trim() || null,
        body.log_member_channel?.trim() || null,
        body.log_message_channel?.trim() || null,
        JSON.stringify({
          mod: !!body.log_mod,
          member: !!body.log_member,
          message: !!body.log_message
        }),
        (body.command_prefix || '!').trim().slice(0, 5) || '!',
        req.params.guildId
      ]
    );
    res.redirect(`/dashboard/${req.params.guildId}?saved=1`);
  } catch (err) {
    console.error('Dashboard update error:', err);
    res.status(500).send('Failed to save settings: ' + err.message);
  }
});


// ===== Custom Commands (dashboard) =====
app.get('/dashboard/:guildId/commands', ensureAuth, async (req, res) => {
  const guild = (await query('SELECT * FROM guilds WHERE guild_id = ?', [req.params.guildId]))[0];
  if (!guild) return res.status(404).send('Guild not found');
  const commands = await query(
    'SELECT * FROM custom_commands WHERE guild_id = ? ORDER BY name',
    [req.params.guildId]
  );
  res.render('commands', { user: req.user, guild, commands, saved: req.query.saved === '1', error: req.query.error });
});

app.post('/dashboard/:guildId/commands/create', ensureAuth, async (req, res) => {
  try {
    let name = (req.body.name || '').toLowerCase().replace(/[^a-z0-9_-]/g, '');
    const response = req.body.response || '';
    if (!name || !response) {
      return res.redirect(`/dashboard/${req.params.guildId}/commands?error=Name+and+response+required`);
    }
    if (name.length > 32) name = name.slice(0, 32);
    await query(
      `INSERT INTO custom_commands (guild_id, name, response, created_by) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE response = VALUES(response)`,
      [req.params.guildId, name, response, req.user.id]
    );
    res.redirect(`/dashboard/${req.params.guildId}/commands?saved=1`);
  } catch (e) {
    console.error(e);
    res.redirect(`/dashboard/${req.params.guildId}/commands?error=` + encodeURIComponent(e.message));
  }
});

app.post('/dashboard/:guildId/commands/delete', ensureAuth, async (req, res) => {
  try {
    await query('DELETE FROM custom_commands WHERE guild_id = ? AND id = ?', [
      req.params.guildId,
      req.body.id
    ]);
    res.redirect(`/dashboard/${req.params.guildId}/commands?saved=1`);
  } catch (e) {
    res.redirect(`/dashboard/${req.params.guildId}/commands?error=` + encodeURIComponent(e.message));
  }
});

app.post('/dashboard/:guildId/commands/update', ensureAuth, async (req, res) => {
  try {
    const id = req.body.id;
    const response = req.body.response || '';
    await query('UPDATE custom_commands SET response = ? WHERE id = ? AND guild_id = ?', [
      response, id, req.params.guildId
    ]);
    res.redirect(`/dashboard/${req.params.guildId}/commands?saved=1`);
  } catch (e) {
    res.redirect(`/dashboard/${req.params.guildId}/commands?error=` + encodeURIComponent(e.message));
  }
});


ensureSchema().then(() => {
  app.listen(PORT, () => {
    console.log(`Dashboard running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Schema error:', err);
  app.listen(PORT, () => console.log(`Dashboard running (schema warning) on :${PORT}`));
});
