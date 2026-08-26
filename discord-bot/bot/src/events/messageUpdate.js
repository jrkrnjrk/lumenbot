const { Events } = require('discord.js');
const { logMessage } = require('../utils/logger');

module.exports = {
  name: Events.MessageUpdate,
  async execute(oldMessage, newMessage) {
    if (!newMessage.guild || newMessage.author?.bot) return;
    if (oldMessage.content === newMessage.content) return;
    await logMessage(newMessage.guild, {
      title: 'Message Edited',
      color: 0xFEE75C,
      fields: [
        { name: 'Author', value: `${newMessage.author.tag} (\`${newMessage.author.id}\`)`, inline: true },
        { name: 'Channel', value: `${newMessage.channel}`, inline: true },
        { name: 'Before', value: (oldMessage.content || '*empty*').slice(0, 500) },
        { name: 'After', value: (newMessage.content || '*empty*').slice(0, 500) },
        { name: 'Jump', value: `[Go to message](${newMessage.url})` }
      ]
    });
  }
};
