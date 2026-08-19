const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('modmail-close')
    .setDescription('Close the current modmail ticket')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  async execute(interaction, client) {
    const tickets = await db.query(
      'SELECT * FROM modmail_tickets WHERE channel_id = ? AND status = "open"',
      [interaction.channel.id]
    );
    if (tickets.length === 0) {
      return interaction.reply({ content: `${config.emojiError} This is not an open modmail channel.`, ephemeral: true });
    }
    const ticket = tickets[0];

    await db.query('UPDATE modmail_tickets SET status = "closed", closed_at = NOW() WHERE id = ?', [ticket.id]);

    const user = await client.users.fetch(ticket.user_id).catch(() => null);
    if (user) {
      await user.send(`Your modmail ticket in **${interaction.guild.name}** has been closed.`).catch(() => {});
    }

    await interaction.reply(`${config.emojiSuccess} Ticket closed. Channel will be deleted in 5 seconds.`);
    setTimeout(() => {
      interaction.channel.delete().catch(() => {});
    }, 5000);
  }
};
