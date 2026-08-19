const { Events } = require('discord.js');
const { logMessage } = require('../utils/logger');

module.exports = {
  name: Events.MessageDelete,
  async execute(message) {
    if (!message.guild || message.author?.bot) return;
    const content = message.content?.slice(0, 1000) || '*No text content*';
    await logMessage(message.guild, {
      title: 'Message Deleted',
      color: 0xED4245,
      fields: [
        { name: 'Author', value: message.author ? `${message.author.tag} (\`${message.author.id}\`)` : 'Unknown', inline: true },
        { name: 'Channel', value: `${message.channel}`, inline: true },
        { name: 'Content', value: content }
      ]
    });
  }
};
