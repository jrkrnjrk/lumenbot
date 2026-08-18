/**
 * Run once to register slash commands globally (or per guild for faster testing)
 * node src/deploy-commands.js
 */
require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');

function load(dir) {
  for (const file of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, file.name);
    if (file.isDirectory()) load(full);
    else if (file.name.endsWith('.js')) {
      const cmd = require(full);
      if (cmd.data) commands.push(cmd.data.toJSON());
    }
  }
}
load(commandsPath);

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log(`Refreshing ${commands.length} application (/) commands.`);
    // Global (takes up to 1 hour to propagate)
    await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID), { body: commands });
    console.log('Successfully registered global commands.');
    // Or for instant testing, uncomment and put a guild ID:
    // await rest.put(Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, 'YOUR_GUILD_ID'), { body: commands });
  } catch (e) {
    console.error(e);
  }
})();
