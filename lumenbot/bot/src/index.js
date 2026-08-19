const { Client, GatewayIntentBits, Partials, Collection, Events, ActivityType } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const db = require('./database');
const { migrate } = require('./utils/migrate');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration
  ],
  partials: [Partials.Channel, Partials.Message, Partials.Reaction, Partials.User]
});

client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
function loadCommands(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const file of files) {
    const full = path.join(dir, file.name);
    if (file.isDirectory()) {
      loadCommands(full);
    } else if (file.name.endsWith('.js')) {
      const command = require(full);
      if (command.data && command.execute) {
        client.commands.set(command.data.name, command);
        console.log(`[Command] Loaded /${command.data.name}`);
      }
    }
  }
}
loadCommands(commandsPath);

const eventsPath = path.join(__dirname, 'events');
for (const file of fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'))) {
  const event = require(path.join(eventsPath, file));
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
  console.log(`[Event] Loaded ${event.name}`);
}

client.once(Events.ClientReady, async () => {
  console.log(`Logged in as ${client.user.tag}`);
  await migrate().catch(err => console.error('[Migrate] Error:', err.message));
  client.user.setActivity('We love the moon!', { type: ActivityType.Playing });

  console.log('[Whitelist] PRE guilds:', config.preWhitelisted.length ? config.preWhitelisted.join(', ') : '(none)');

  // Force-whitelist every ID from .env
  for (const gid of config.preWhitelisted) {
    try {
      await db.query(
        `INSERT INTO guilds (guild_id, whitelisted, waitlisted) VALUES (?, 1, 1)
         ON DUPLICATE KEY UPDATE whitelisted = 1, waitlisted = 1`,
        [gid]
      );
      const g = await client.guilds.fetch(gid).catch(() => null);
      if (g) {
        await db.query('UPDATE guilds SET name = ? WHERE guild_id = ?', [g.name, gid]);
        console.log(`[Whitelist] Pre-whitelisted: ${g.name} (${gid})`);
      } else {
        console.log(`[Whitelist] Pre-whitelisted ID (bot not in guild yet): ${gid}`);
      }
    } catch (e) {
      console.error('[Whitelist] Failed for', gid, e.message);
    }
  }

  // Leave non-whitelisted guilds (unless in PRE list)
  for (const [id, guild] of client.guilds.cache) {
    await db.ensureGuild(guild);
    if (config.preWhitelisted.includes(id)) {
      await db.setGuildWhitelisted(id, true);
      continue;
    }
    const allowed = await db.isGuildWhitelisted(id);
    if (!allowed) {
      console.log(`[Whitelist] Leaving non-whitelisted guild: ${guild.name} (${id})`);
      await guild.leave().catch(() => {});
    }
  }
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
});

client.login(config.token);
