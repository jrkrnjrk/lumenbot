const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getSettings } = require('../../utils/guildSettings');
const { getInfractions } = require('../../utils/infractions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('infractions')
    .setDescription('View a member\'s infractions')
    .addUserOption(o => o.setName('user').setDescription('User to check').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const settings = await getSettings(interaction.guildId);
    const user = interaction.options.getUser('user');

    const rows = await getInfractions(interaction.guildId, user.id);

    if (rows.length === 0) {
      return interaction.reply(`${settings.emojiSuccess} **${user.tag}** has no infractions.`);
    }

    const lines = rows.map((r, i) => {
      const date = new Date(r.created_at).toLocaleDateString();
      return `**${i + 1}.** \`${r.type}\` — ${r.reason || 'No reason'} *(${date})*`;
    });

    const embed = new EmbedBuilder()
      .setTitle(`Infractions for ${user.tag}`)
      .setDescription(lines.join('\n').slice(0, 4000))
      .setColor(0xFEE75C)
      .setFooter({ text: `Total: ${rows.length}` });

    await interaction.reply({ embeds: [embed] });
  }
};
