const { Events, ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const db = require('../database');
const config = require('../config');

module.exports = {
  name: Events.MessageCreate,
  async execute(message, client) {
    if (message.author.bot) return;

    // ===== MODMAIL: User DMs the bot =====
    if (message.channel.type === ChannelType.DM) {
      const existing = await db.query(
        'SELECT * FROM modmail_tickets WHERE user_id = ? AND status = "open" LIMIT 1',
        [message.author.id]
      );

      if (existing.length > 0) {
        const ticket = existing[0];
        const channel = await client.channels.fetch(ticket.channel_id).catch(() => null);
        if (channel) {
          const embed = new EmbedBuilder()
            .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
            .setDescription(message.content || '*No content*')
            .setColor(0x5865F2)
            .setTimestamp();
          if (message.attachments.size > 0) {
            embed.addFields({ name: 'Attachments', value: message.attachments.map(a => a.url).join('\n') });
          }
          await channel.send({ embeds: [embed] });
        }
        return;
      }

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('modmail_create')
          .setLabel('Yes, open a ticket')
          .setStyle(ButtonStyle.Success)
          .setEmoji('✅'),
        new ButtonBuilder()
          .setCustomId('modmail_cancel')
          .setLabel('No')
          .setStyle(ButtonStyle.Secondary)
      );

      await message.reply({
        content: 'Do you want to create a **modmail ticket**?',
        components: [row]
      });
      return;
    }

    // ===== MODMAIL: Staff replies in ticket channel =====
    if (message.guild && message.channel.name?.startsWith('modmail-')) {
      const tickets = await db.query(
        'SELECT * FROM modmail_tickets WHERE channel_id = ? AND status = "open"',
        [message.channel.id]
      );
      if (tickets.length === 0) return;

      const ticket = tickets[0];
      const user = await client.users.fetch(ticket.user_id).catch(() => null);
      if (!user) return;
      if (message.content.startsWith('/')) return;

      const embed = new EmbedBuilder()
        .setAuthor({ name: `Staff • ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
        .setDescription(message.content || '*No content*')
        .setColor(0x57F287)
        .setTimestamp();

      try {
        await user.send({ embeds: [embed] });
      } catch {
        await message.reply(`${config.emojiError} Could not DM the user (they may have DMs closed).`);
      }
    }
  }
};
