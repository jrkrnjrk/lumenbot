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

app.get('/login', (req, res) => res.render('login'));

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
  const guilds = await query('SELECT * FROM guilds WHERE waitlisted = 1 ORDER BY name');
  res.render('dashboard', { user: req.user, guilds });
});

app.get('/dashboard/:guildId', ensureAuth, async (req, res) => {
  const guild = (await query('SELECT * FROM guilds WHERE guild_id = ?', [req.params.guildId]))[0];
  if (!guild) return res.status(404).send('Guild not found');

  let plugins = {};
  try { plugins = typeof guild.plugins === 'string' ? JSON.parse(guild.plugins) : guild.plugins || {}; } catch {}

  let automod = { enabled: false, invites: true, badwords: true, websites: false, action: 'clear', badword_list: '' };
  try {
    automod = typeof guild.automod === 'string' ? JSON.parse(guild.automod) : (guild.automod || automod);
  } catch {}

  res.render('guild', {
    user: req.user,
    guild,
    plugins,
    automod,
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
    automod: !!body.automod
  };

  const automod = {
    enabled: !!body.automod_enabled,
    invites: !!body.automod_invites,
    badwords: !!body.automod_badwords,
    websites: !!body.automod_websites,
    action: body.automod_action || 'clear',
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
        automod = ?
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
        req.params.guildId
      ]
    );
    res.redirect(`/dashboard/${req.params.guildId}?saved=1`);
  } catch (err) {
    console.error('Dashboard update error:', err);
    res.status(500).send('Failed to save settings: ' + err.message);
  }
});

app.listen(PORT, () => {
  console.log(`Dashboard running on http://localhost:${PORT}`);
});
