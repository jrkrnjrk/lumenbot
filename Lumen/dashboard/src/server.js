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

async function canAccessDashboard(discordId) {
  const owners = (process.env.OWNER_IDS || '').split(',').map(s => s.trim());
  if (owners.includes(discordId)) return true;
  const rows = await query('SELECT 1 FROM dashboard_users WHERE discord_id = ?', [discordId]);
  return rows.length > 0;
}

app.get('/', (req, res) => {
  if (req.isAuthenticated()) return res.redirect('/dashboard');
  res.redirect('/login');
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.get('/auth/discord', passport.authenticate('discord'));
app.get('/auth/discord/callback',
  passport.authenticate('discord', { failureRedirect: '/login' }),
  async (req, res) => {
    const allowed = await canAccessDashboard(req.user.id);
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
  // Show guilds the user is in that the bot is also in (from DB)
  const guilds = await query('SELECT * FROM guilds WHERE waitlisted = 1 ORDER BY name');
  res.render('dashboard', { user: req.user, guilds });
});

app.get('/dashboard/:guildId', ensureAuth, async (req, res) => {
  const guild = (await query('SELECT * FROM guilds WHERE guild_id = ?', [req.params.guildId]))[0];
  if (!guild) return res.status(404).send('Guild not found');
  let plugins = {};
  try { plugins = typeof guild.plugins === 'string' ? JSON.parse(guild.plugins) : guild.plugins || {}; } catch {}

  // Load linked Roblox group for this server
  const rg = await query('SELECT group_id FROM roblox_groups WHERE guild_id = ?', [req.params.guildId]);
  const robloxGroupId = rg[0]?.group_id || '';

  res.render('guild', {
    user: req.user,
    guild,
    plugins,
    robloxGroupId,
    saved: req.query.saved === '1'
  });
});

app.post('/dashboard/:guildId/update', ensureAuth, async (req, res) => {
  const {
    modmail_enabled, dm_before_mod,
    moderation, reactionroles, modmail, verification,
    verified_role_id, modmail_category_id,
    emoji_success, emoji_error,
    roblox_group_id
  } = req.body;

  const plugins = {
    
    moderation: !!moderation,
    reactionroles: !!reactionroles,
    modmail: !!modmail,
    verification: !!verification
  };

  await query(
    `UPDATE guilds SET 
      modmail_enabled = ?, 
      dm_before_mod = ?,
      plugins = ?,
      verified_role_id = ?,
      modmail_category_id = ?,
      emoji_success = ?,
      emoji_error = ?
     WHERE guild_id = ?`,
    [
      modmail_enabled === 'on' ? 1 : 0,
      dm_before_mod === 'on' ? 1 : 0,
      JSON.stringify(plugins),
      verified_role_id?.trim() || null,
      modmail_category_id?.trim() || null,
      emoji_success?.trim() || null,
      emoji_error?.trim() || null,
      req.params.guildId
    ]
  );

  // Save / update Roblox Group ID for this server
  const groupId = roblox_group_id?.trim();
  if (groupId) {
    await query(
      `INSERT INTO roblox_groups (guild_id, group_id) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE group_id = VALUES(group_id)`,
      [req.params.guildId, groupId]
    );
  } else {
    // If cleared, remove the link (will fall back to DEFAULT_GROUP_ID)
    await query('DELETE FROM roblox_groups WHERE guild_id = ?', [req.params.guildId]);
  }

  res.redirect(`/dashboard/${req.params.guildId}?saved=1`);
});

app.listen(PORT, () => {
  console.log(`Dashboard running on http://localhost:${PORT}`);
});
