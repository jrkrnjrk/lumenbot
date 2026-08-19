const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database');
const { getSettings } = require('../../utils/guildSettings');
const { addInfraction } = require('../../utils/infractions');
const { logMod } = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a member (saved as an infraction)')
    .addUserOption(o => o.setName('user').setDescription('User to warn').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const settings = await getSettings(interaction.guildId);
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason');

    const guildSettings = await db.getGuildSettings(interaction.guildId);

    // DM if enabled
    if (guildSettings?.dm_before_mod) {
      try {
        await user.send(`You received a warning in **${interaction.guild.name}**.\nReason: ${reason}`);
      } catch {}
    }

    await addInfraction(interaction.guildId, user.id, interaction.user.id, 'warn', reason);
    await logMod(interaction.guild, { action: 'warn', target: user, moderator: interaction.user, reason });

    await interaction.reply(`${settings.emojiSuccess} Warned **${user.tag}**. Reason: ${reason}`);
  }
};
