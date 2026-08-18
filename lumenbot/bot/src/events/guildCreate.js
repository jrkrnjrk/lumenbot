const { Events } = require('discord.js');
const db = require('../database');
const config = require('../config');

module.exports = {
  name: Events.GuildCreate,
  async execute(guild, client) {
    console.log(`[Guild] Joined ${guild.name} (${guild.id})`);
    await db.ensureGuild(guild);

    const allowed = await db.isGuildWaitlisted(guild.id) || config.preWaitlisted.includes(guild.id);
    if (!allowed) {
      console.log(`[Waitlist] Leaving non-waitlisted guild ${guild.name}`);
      try {
        const owner = await guild.fetchOwner();
        await owner.send(`Hi! I left **${guild.name}** because it is not on the waitlist. Contact the bot owners to get it approved.`).catch(() => {});
      } catch {}
      await guild.leave();
    }
  }
};
