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

  for (const gid of config.preWaitlisted) {
    try {
      const g = await client.guilds.fetch(gid).catch(() => null);
      if (g) await db.ensureGuild(g);
      await db.setGuildWaitlisted(gid, true);
    } catch {}
  }

  for (const [id, guild] of client.guilds.cache) {
    await db.ensureGuild(guild);
    const allowed = await db.isGuildWaitlisted(id);
    if (!allowed && !config.preWaitlisted.includes(id)) {
      console.log(`[Waitlist] Leaving non-allowed guild: ${guild.name} (${id})`);
      await guild.leave().catch(() => {});
    }
  }
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
});

client.login(config.token);
