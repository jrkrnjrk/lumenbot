const { Client, GatewayIntentBits, Partials, Collection, Events, ActivityType } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const db = require('./database');

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
client.statusInterval = null;
client.customStatus = null;

// Rotating statuses
const rotatingStatuses = [
  { text: 'I love the moon', type: ActivityType.Playing },
  { text: 'DM ME TO CONTACT AN ADMIN!', type: ActivityType.Playing }
];
let statusIndex = 0;

function startStatusRotation(client) {
  if (client.statusInterval) clearInterval(client.statusInterval);

  // Set first status immediately
  const first = rotatingStatuses[0];
  client.user.setActivity(first.text, { type: first.type });
  statusIndex = 1;

  client.statusInterval = setInterval(() => {
    // If a custom status was set via /status, don't rotate
    if (client.customStatus) return;

    const status = rotatingStatuses[statusIndex % rotatingStatuses.length];
    client.user.setActivity(status.text, { type: status.type });
    statusIndex++;
  }, 30_000); // every 30 seconds
}

// Load commands
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

// Load events
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

  // Start rotating statuses
  startStatusRotation(client);

  // Ensure pre-waitlisted guilds exist
  for (const gid of config.preWaitlisted) {
    try {
      const g = await client.guilds.fetch(gid).catch(() => null);
      if (g) await db.ensureGuild(g);
      await db.setGuildWaitlisted(gid, true);
    } catch {}
  }

  // Leave non-waitlisted guilds
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
