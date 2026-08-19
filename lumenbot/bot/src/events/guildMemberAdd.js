const { Events } = require('discord.js');
const { logMember } = require('../utils/logger');

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    await logMember(member.guild, {
      title: 'Member Joined',
      description: `${member.user.tag} joined the server`,
      color: 0x57F287,
      fields: [
        { name: 'User', value: `<@${member.id}> (\`${member.id}\`)`, inline: true },
        { name: 'Account created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
        { name: 'Member count', value: String(member.guild.memberCount), inline: true }
      ]
    });
  }
};
