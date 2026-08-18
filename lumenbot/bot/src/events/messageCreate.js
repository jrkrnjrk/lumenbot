const { Events, ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../database');
const config = require('../config');
const { getSettings } = require('../utils/guildSettings');

const INVITE_REGEX = /(discord\.gg\/|discord\.com\/invite\/|discordapp\.com\/invite\/)/i;
const URL_REGEX = /https?:\/\/[^\s]+/i;

async function runAutomod(message, client) {
  if (!message.guild || message.author.bot) return false;
  if (message.member?.permissions?.has('ManageMessages')) return false; // staff bypass

  const guildSettings = await db.getGuildSettings(message.guild.id);
  if (!guildSettings) return false;

  let automod = {};
  try {
    automod = typeof guildSettings.automod === 'string' ? JSON.parse(guildSettings.automod) : (guildSettings.automod || {});
  } catch { return false; }

  if (!automod.enabled) return false;

  const content = message.content || '';
  let triggered = null;

  if (automod.invites && INVITE_REGEX.test(content)) triggered = 'invite';
  if (!triggered && automod.websites && URL_REGEX.test(content)) triggered = 'website';
  if (!triggered && automod.badwords) {
    const list = (automod.badword_list || '').split(',').map(w => w.trim().toLowerCase()).filter(Boolean);
    const lower = content.toLowerCase();
    for (const word of list) {
      if (word && lower.includes(word)) {
        triggered = 'badword';
        break;
      }
    }
  }

  if (!triggered) return false;

  // Always delete the message
  await message.delete().catch(() => {});

  const action = automod.action || 'clear';
  const reason = `Automod: ${triggered}`;
  const member = message.member;

  try {
    if (action === 'clear+ban') {
      await message.guild.members.ban(message.author.id, { reason, deleteMessageSeconds: 0 });
    } else if (action === 'clear+soft') {
      await message.guild.members.ban(message.author.id, { reason, deleteMessageSeconds: 60 * 60 * 24 * 7 });
      await message.guild.members.unban(message.author.id, 'Softban complete');
    } else if (action === 'clear+kick') {
      if (member?.kickable) await member.kick(reason);
    } else if (action === 'clear+mute') {
      const mutedRoleId = guildSettings.muted_role_id;
      if (mutedRoleId && member) {
        await member.roles.add(mutedRoleId, reason).catch(() => {});
      }
    }
    // 'clear' = just delete (already done)
  } catch (e) {
    console.error('Automod action failed:', e.message);
  }

  return true;
}

module.exports = {
  name: Events.MessageCreate,
  async execute(message, client) {
    if (message.author.bot) return;

    // ===== AUTOMOD =====
    if (message.guild) {
      const handled = await runAutomod(message, client);
      if (handled) return;
    }

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
        new ButtonBuilder().setCustomId('modmail_create').setLabel('Yes, open a ticket').setStyle(ButtonStyle.Success).setEmoji('✅'),
        new ButtonBuilder().setCustomId('modmail_cancel').setLabel('No').setStyle(ButtonStyle.Secondary)
      );

      await message.reply({ content: 'Do you want to create a **modmail ticket**?', components: [row] });
      return;
    }

    // ===== MODMAIL: Staff replies =====
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
        await message.reply(`${config.emojiError} Could not DM the user.`);
      }
    }
  }
};
