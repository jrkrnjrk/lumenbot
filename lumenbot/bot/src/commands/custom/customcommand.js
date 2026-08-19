const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../../database');
const { getSettings } = require('../../utils/guildSettings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('customcommand')
    .setDescription('Create coded custom commands for this server')
    .addSubcommand(sc =>
      sc.setName('create')
        .setDescription('Create or update a custom command')
        .addStringOption(o => o.setName('name').setDescription('Command name (used as !name)').setRequired(true))
        .addStringOption(o => o.setName('response').setDescription('Text, EMBED|{json}, or CODE|script').setRequired(true))
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
    .addSubcommand(sc =>
      sc.setName('help')
        .setDescription('Show how to code custom commands')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const settings = await getSettings(interaction.guildId);
    const sub = interaction.options.getSubcommand();

    if (sub === 'help') {
      const embed = new EmbedBuilder()
        .setTitle('Custom Commands — How to code them')
        .setColor(0xc9b896)
        .setDescription(
          'Use `/customcommand create` then trigger with `!name` in chat.\n\n' +
          '**1. Plain text + placeholders**\n' +
          '`Hello {user.mention} on {server}! Args: {args}`\n\n' +
          'Placeholders: `{user}` `{user.tag}` `{user.mention}` `{user.id}`\n' +
          '`{server}` `{server.id}` `{server.members}` `{channel}` `{args}` `{args1}`…\n' +
          '`{random:hi|hey|hello}`\n\n' +
          '**2. Embed mode** — start with `EMBED|` + JSON:\n' +
          '```\nEMBED|{"title":"Hi {user}","description":"Welcome to {server}","color":"#5865F2"}\n```\n\n' +
          '**3. Code mode** — start with `CODE|` + JavaScript (must return string or embed object):\n' +
          '```\nCODE|return "Hey " + user.mention + "! You said: " + args.join(" ");\n```\n' +
          '```\nCODE|return { title: "Stats", description: server.name + " has " + server.members + " members", color: "#c9b896" };\n```\n\n' +
          'Available in CODE: `user`, `server`, `channel`, `args`, `Math`, `JSON`'
        );
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === 'create') {
      const name = interaction.options.getString('name').toLowerCase().replace(/[^a-z0-9_-]/g, '');
      const response = interaction.options.getString('response');
      if (!name) {
        return interaction.reply({ content: `${settings.emojiError} Invalid name.`, ephemeral: true });
      }
      if (name.length > 32) {
        return interaction.reply({ content: `${settings.emojiError} Name too long (max 32).`, ephemeral: true });
      }
      await db.query(
        `INSERT INTO custom_commands (guild_id, name, response, created_by) VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE response = VALUES(response)`,
        [interaction.guildId, name, response, interaction.user.id]
      );
      const mode = response.trim().startsWith('CODE|') ? 'code' : response.trim().startsWith('EMBED|') ? 'embed' : 'text';
      return interaction.reply(
        `${settings.emojiSuccess} Custom command \`!${name}\` saved (**${mode}** mode).\n` +
        `Use \`/customcommand help\` for coding docs.`
      );
    }

    if (sub === 'delete') {
      const name = interaction.options.getString('name').toLowerCase();
      await db.query('DELETE FROM custom_commands WHERE guild_id = ? AND name = ?', [interaction.guildId, name]);
      return interaction.reply(`${settings.emojiSuccess} Deleted \`!${name}\`.`);
    }

    if (sub === 'list') {
      const rows = await db.query(
        'SELECT name, response FROM custom_commands WHERE guild_id = ? ORDER BY name',
        [interaction.guildId]
      );
      if (!rows.length) {
        return interaction.reply(`${settings.emojiSuccess} No custom commands. Use \`/customcommand help\`.`);
      }
      const list = rows.map(r => {
        const mode = r.response.trim().startsWith('CODE|') ? 'code' : r.response.trim().startsWith('EMBED|') ? 'embed' : 'text';
        return `\`!${r.name}\` (${mode})`;
      }).join('\n');
      return interaction.reply({ content: `**Custom commands:**\n${list}`, ephemeral: true });
    }
  }
};
