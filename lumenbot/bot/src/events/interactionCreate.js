const { Events, MessageFlags } = require('discord.js');
const db = require('../database');
const config = require('../config');
const { getVerifiedRole, getSettings } = require('../utils/guildSettings');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction, client) {
    // ===== Slash commands =====
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      if (!config.ownerIds.includes(interaction.user.id)) {
        const settings = await db.getGuildSettings(interaction.guildId);
        if (!settings || !settings.waitlisted) {
          return interaction.reply({ content: `${config.emojiError} This server is not waitlisted.`, flags: MessageFlags.Ephemeral });
        }
      }

      try {
        await command.execute(interaction, client);
      } catch (error) {
        console.error(error);
        const msg = { content: `${config.emojiError} There was an error executing this command.`, flags: MessageFlags.Ephemeral };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(msg).catch(() => {});
        } else {
          await interaction.reply(msg).catch(() => {});
        }
      }
    }

    // ===== Buttons =====
    if (interaction.isButton()) {
      const id = interaction.customId;
      const settings = await getSettings(interaction.guildId || '0');

      // Start verification from the panel
      if (id === 'verify_start') {
        const verifyCmd = client.commands.get('verify');
        if (verifyCmd) return verifyCmd.execute(interaction);
      }

      // Check the code the user put in their bio
      if (id.startsWith('verify_check_')) {
        const userId = id.replace('verify_check_', '');
        if (interaction.user.id !== userId) {
          return interaction.reply({ content: `${settings.emojiError} This button is not for you.`, ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        const verifyCmd = client.commands.get('verify');
        const pending = verifyCmd?.pendingCodes?.get(userId);

        if (!pending || Date.now() > pending.expires) {
          return interaction.editReply(`${settings.emojiError} Code expired or not found. Run /verify again.`);
        }

        await interaction.editReply({
          content: 'What is your **Roblox username**?\nPlease type it in this chat within 60 seconds.'
        });

        const filter = m => m.author.id === userId;
        const collected = await interaction.channel.awaitMessages({ filter, max: 1, time: 60000 }).catch(() => null);

        if (!collected || collected.size === 0) {
          return interaction.followUp({ content: `${settings.emojiError} Timed out. Run the verification again.`, ephemeral: true });
        }

        const robloxUsername = collected.first().content.trim();
        await collected.first().delete().catch(() => {});

        try {
          const userRes = await fetch(`https://users.roblox.com/v1/usernames/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usernames: [robloxUsername], excludeBannedUsers: true })
          });
          const userData = await userRes.json();

          if (!userData.data || userData.data.length === 0) {
            return interaction.followUp({ content: `${settings.emojiError} Roblox user **${robloxUsername}** not found.`, ephemeral: true });
          }

          const robloxId = userData.data[0].id;

          const profileRes = await fetch(`https://users.roblox.com/v1/users/${robloxId}`);
          const profile = await profileRes.json();

          if (!profile.description || !profile.description.includes(pending.code)) {
            return interaction.followUp({
              content: `${settings.emojiError} I couldn't find the code \`${pending.code}\` in your Roblox description.\nMake sure you saved it and try again.`,
              ephemeral: true
            });
          }

          await db.query(
            `INSERT INTO users (discord_id, roblox_id, roblox_username, verified_at)
             VALUES (?, ?, ?, NOW())
             ON DUPLICATE KEY UPDATE roblox_id = VALUES(roblox_id), roblox_username = VALUES(roblox_username), verified_at = NOW()`,
            [userId, String(robloxId), robloxUsername]
          );

          const member = await interaction.guild.members.fetch(userId).catch(() => null);
          if (member) {
            await member.setNickname(robloxUsername).catch(() => {});
            const role = await getVerifiedRole(interaction.guild);
            if (role) await member.roles.add(role).catch(() => {});
          }

          verifyCmd.pendingCodes.delete(userId);

          await interaction.followUp({
            content: `${settings.emojiSuccess} Successfully verified as **${robloxUsername}**!`,
            ephemeral: true
          });
        } catch (err) {
          console.error('Verification error:', err);
          await interaction.followUp({ content: `${settings.emojiError} Something went wrong. Please try again.`, ephemeral: true });
        }
      }

      // Reaction role buttons
      if (id.startsWith('rr_')) {
        const roleId = id.replace('rr_', '');
        const member = interaction.member;
        if (!member) return;
        try {
          if (member.roles.cache.has(roleId)) {
            await member.roles.remove(roleId);
            await interaction.reply({ content: `${settings.emojiSuccess} Role removed.`, ephemeral: true });
          } else {
            await member.roles.add(roleId);
            await interaction.reply({ content: `${settings.emojiSuccess} Role added.`, ephemeral: true });
          }
        } catch (e) {
          await interaction.reply({ content: `${settings.emojiError} Could not toggle role (check hierarchy).`, ephemeral: true });
        }
      }

      // Modmail create
      if (id === 'modmail_create') {
        await interaction.deferUpdate();
        const mutual = client.guilds.cache.filter(g => g.members.cache.has(interaction.user.id));
        let targetGuild = null;
        for (const [, g] of mutual) {
          const gs = await db.getGuildSettings(g.id);
          if (gs && gs.waitlisted && gs.modmail_enabled !== false) {
            targetGuild = g;
            break;
          }
        }
        if (!targetGuild) {
          return interaction.followUp({ content: `${config.emojiError} No suitable server found for modmail.`, ephemeral: true });
        }

        const banned = await db.query('SELECT 1 FROM modmail_bans WHERE guild_id = ? AND user_id = ?', [targetGuild.id, interaction.user.id]);
        if (banned.length) {
          return interaction.followUp({ content: `${config.emojiError} You are banned from modmail.`, ephemeral: true });
        }

        const guildSettings = await db.getGuildSettings(targetGuild.id);
        let category = null;
        if (guildSettings?.modmail_category_id) {
          category = targetGuild.channels.cache.get(guildSettings.modmail_category_id);
        }
        if (!category) {
          category = targetGuild.channels.cache.find(c => c.name === config.modmailCategoryName && c.type === 4);
        }
        if (!category) {
          category = await targetGuild.channels.create({ name: config.modmailCategoryName, type: 4 });
        }

        const channel = await targetGuild.channels.create({
          name: `modmail-${interaction.user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 90),
          type: 0,
          parent: category.id,
          topic: `Modmail for ${interaction.user.tag} (${interaction.user.id})`
        });

        await db.query('INSERT INTO modmail_tickets (guild_id, user_id, channel_id) VALUES (?, ?, ?)', [targetGuild.id, interaction.user.id, channel.id]);
        await channel.send(`📩 New modmail ticket from <@${interaction.user.id}> (\`${interaction.user.id}\`)\nAnything said here will be sent to the user.`);
        await interaction.followUp({ content: `${config.emojiSuccess} Ticket created! Staff will reply soon.`, ephemeral: true });
      }

      if (id === 'modmail_cancel') {
        await interaction.update({ content: 'Cancelled.', components: [] });
      }
    }
  }
};
