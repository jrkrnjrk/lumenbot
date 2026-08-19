const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database');
const config = require('../../config');
const { getSettings } = require('../../utils/guildSettings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('servers')
    .setDescription('List all servers the bot is in and their whitelist status (Owner only)'),

  async execute(interaction, client) {
    if (!config.ownerIds.includes(interaction.user.id)) {
      const settings = await getSettings(interaction.guildId || '0');
      return interaction.reply({
        content: `${settings.emojiError} Owner only.`,
        ephemeral: true
      });
    }

    await interaction.deferReply({ ephemeral: true });

    const guilds = [...client.guilds.cache.values()];
    if (guilds.length === 0) {
      return interaction.editReply('Bot is not in any servers.');
    }

    const lines = [];
    for (const g of guilds) {
      const row = await db.getGuildSettings(g.id);
      const whitelisted = row?.whitelisted ? '✅ Whitelisted' : '❌ Not whitelisted';
      lines.push(`**${g.name}**\n└ ID: \`${g.id}\` • Members: ${g.memberCount} • ${whitelisted}`);
    }

    // Discord embed description max is 4096 chars
    const chunks = [];
    let current = '';
    for (const line of lines) {
      if ((current + line + '\n\n').length > 4000) {
        chunks.push(current);
        current = line + '\n\n';
      } else {
        current += line + '\n\n';
      }
    }
    if (current) chunks.push(current);

    const embed = new EmbedBuilder()
      .setTitle(`Servers (${guilds.length})`)
      .setDescription(chunks[0])
      .setColor(0x5865F2)
      .setFooter({ text: 'Owner only command' });

    await interaction.editReply({ embeds: [embed] });

    // Send extra pages if needed
    for (let i = 1; i < chunks.length; i++) {
      const extra = new EmbedBuilder()
        .setTitle(`Servers (continued)`)
        .setDescription(chunks[i])
        .setColor(0x5865F2);
      await interaction.followUp({ embeds: [extra], ephemeral: true });
    }
  }
};
