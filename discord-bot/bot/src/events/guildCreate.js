const { Events } = require('discord.js');
const db = require('../database');
const config = require('../config');

module.exports = {
  name: Events.GuildCreate,
  async execute(guild, client) {
    console.log(`[Guild] Joined ${guild.name} (${guild.id})`);
    await db.ensureGuild(guild);

    const allowed = await db.isGuildWhitelisted(guild.id) || config.preWhitelisted.includes(guild.id);
    if (!allowed) {
      console.log(`[Whitelist] Leaving non-whitelisted guild ${guild.name}`);
      try {
        const owner = await guild.fetchOwner();
        await owner.send(`Hi! I left **${guild.name}** because it is not on the whitelist. Contact the bot owners to get it approved.`).catch(() => {});
      } catch {}
      await guild.leave();
    }
  }
};
