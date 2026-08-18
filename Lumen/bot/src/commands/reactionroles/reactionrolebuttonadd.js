const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../database');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reactionrolebuttonadd')
    .setDescription('Create a button-based reaction role message')
    .addRoleOption(o => o.setName('role').setDescription('Role to give').setRequired(true))
    .addStringOption(o => o.setName('label').setDescription('Button label').setRequired(true))
    .addStringOption(o =>
      o.setName('color')
        .setDescription('Button color')
        .setRequired(true)
        .addChoices(
          { name: 'Primary (Blurple)', value: 'PRIMARY' },
          { name: 'Secondary (Grey)', value: 'SECONDARY' },
          { name: 'Success (Green)', value: 'SUCCESS' },
          { name: 'Danger (Red)', value: 'DANGER' }
        )
    )
    .addStringOption(o => o.setName('title').setDescription('Embed title').setRequired(false))
    .addStringOption(o => o.setName('description').setDescription('Embed description').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
  async execute(interaction) {
    const role = interaction.options.getRole('role');
    const label = interaction.options.getString('label');
    const color = interaction.options.getString('color');
    const title = interaction.options.getString('title') || 'Reaction Role';
    const description = interaction.options.getString('description') || `Click the button to get the **${role.name}** role.`;

    const styleMap = {
      PRIMARY: ButtonStyle.Primary,
      SECONDARY: ButtonStyle.Secondary,
      SUCCESS: ButtonStyle.Success,
      DANGER: ButtonStyle.Danger
    };

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(0x5865F2);

    const customId = `rr_${role.id}`;
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(customId)
        .setLabel(label)
        .setStyle(styleMap[color] || ButtonStyle.Primary)
    );

    const msg = await interaction.channel.send({ embeds: [embed], components: [row] });

    await db.query(
      `INSERT INTO button_roles (guild_id, message_id, channel_id, custom_id, role_id, label, style)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [interaction.guildId, msg.id, interaction.channel.id, customId, role.id, label, color]
    );

    await interaction.reply({ content: `${config.emojiSuccess} Button reaction role created.`, ephemeral: true });
  }
};
