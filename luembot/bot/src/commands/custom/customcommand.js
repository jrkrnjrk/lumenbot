const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database');
const { getSettings } = require('../../utils/guildSettings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('customcommand')
    .setDescription('Manage custom commands for this server')
    .addSubcommand(sc =>
      sc.setName('create')
        .setDescription('Create a custom command')
        .addStringOption(o => o.setName('name').setDescription('Command name (no spaces)').setRequired(true))
        .addStringOption(o => o.setName('response').setDescription('What the bot replies').setRequired(true))
    )
    .addSubcommand(sc =>
      sc.setName('delete')
        .setDescription('Delete a custom command')
        .addStringOption(o => o.setName('name').setDescription('Command name').setRequired(true))
    )
    .addSubcommand(sc =>
      sc.setName('list')
        .setDescription('List all custom commands')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const settings = await getSettings(interaction.guildId);
    const sub = interaction.options.getSubcommand();

    if (sub === 'create') {
      const name = interaction.options.getString('name').toLowerCase().replace(/[^a-z0-9_-]/g, '');
      const response = interaction.options.getString('response');
      if (!name) {
        return interaction.reply({ content: `${settings.emojiError} Invalid name.`, ephemeral: true });
      }
      await db.query(
        `INSERT INTO custom_commands (guild_id, name, response, created_by) VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE response = VALUES(response)`,
        [interaction.guildId, name, response, interaction.user.id]
      );
      return interaction.reply(`${settings.emojiSuccess} Custom command \`!${name}\` created.`);
    }

    if (sub === 'delete') {
      const name = interaction.options.getString('name').toLowerCase();
      await db.query('DELETE FROM custom_commands WHERE guild_id = ? AND name = ?', [interaction.guildId, name]);
      return interaction.reply(`${settings.emojiSuccess} Deleted \`!${name}\`.`);
    }

    if (sub === 'list') {
      const rows = await db.query('SELECT name, response FROM custom_commands WHERE guild_id = ? ORDER BY name', [interaction.guildId]);
      if (!rows.length) {
        return interaction.reply(`${settings.emojiSuccess} No custom commands yet.`);
      }
      const list = rows.map(r => `\`!${r.name}\` → ${r.response.slice(0, 80)}${r.response.length > 80 ? '…' : ''}`).join('\n');
      return interaction.reply({ content: `**Custom commands:**\n${list}`, ephemeral: true });
    }
  }
};
