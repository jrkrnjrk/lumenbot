const { Events } = require('discord.js');
const { logMember } = require('../utils/logger');

module.exports = {
  name: Events.GuildMemberUpdate,
  async execute(oldMember, newMember) {
    // Nickname
    if (oldMember.nickname !== newMember.nickname) {
      await logMember(newMember.guild, {
        title: 'Nickname Changed',
        color: 0x5865F2,
        fields: [
          { name: 'User', value: `<@${newMember.id}>`, inline: true },
          { name: 'Before', value: oldMember.nickname || oldMember.user.username, inline: true },
          { name: 'After', value: newMember.nickname || newMember.user.username, inline: true }
        ]
      });
    }

    // Roles
    const oldRoles = oldMember.roles.cache;
    const newRoles = newMember.roles.cache;
    const added = newRoles.filter(r => !oldRoles.has(r.id) && r.id !== newMember.guild.id);
    const removed = oldRoles.filter(r => !newRoles.has(r.id) && r.id !== newMember.guild.id);

    if (added.size) {
      await logMember(newMember.guild, {
        title: 'Role Added',
        color: 0x57F287,
        fields: [
          { name: 'User', value: `<@${newMember.id}>`, inline: true },
          { name: 'Roles', value: added.map(r => r.toString()).join(', ') }
        ]
      });
    }
    if (removed.size) {
      await logMember(newMember.guild, {
        title: 'Role Removed',
        color: 0xE67E22,
        fields: [
          { name: 'User', value: `<@${newMember.id}>`, inline: true },
          { name: 'Roles', value: removed.map(r => r.toString()).join(', ') }
        ]
      });
    }
  }
};
