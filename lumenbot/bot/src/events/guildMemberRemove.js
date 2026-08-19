const { Events } = require('discord.js');
const { logMember } = require('../utils/logger');

module.exports = {
  name: Events.GuildMemberRemove,
  async execute(member) {
    await logMember(member.guild, {
      title: 'Member Left',
      description: `${member.user?.tag || 'Unknown'} left the server`,
      color: 0xED4245,
      fields: [
        { name: 'User', value: `${member.user?.tag || 'Unknown'} (\`${member.id}\`)`, inline: true },
        { name: 'Member count', value: String(member.guild.memberCount), inline: true }
      ]
    });
  }
};
