const {
  Events,
  MessageFlags,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');
const db = require('../database');
const config = require('../config');
const { getVerifiedRole, getSettings } = require('../utils/guildSettings');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction, client) {

    // ===================== SLASH COMMANDS =====================
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      if (!config.ownerIds.includes(interaction.user.id)) {
        const settings = await db.getGuildSettings(interaction.guildId);
        if (!settings || !settings.waitlisted) {
          return interaction.reply({
            content: `${config.emojiError} This server is not waitlisted.`,
            flags: MessageFlags.Ephemeral
          });
        }
      }

      try {
        await command.execute(interaction, client);
      } catch (error) {
        console.error(error);
        const msg = {
          content: `${config.emojiError} There was an error executing this command.`,
          flags: MessageFlags.Ephemeral
        };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(msg).catch(() => {});
        } else {
          await interaction.reply(msg).catch(() => {});
        }
      }
    }

    // ===================== MODALS =====================
    if (interaction.isModalSubmit()) {
      const settings = await getSettings(interaction.guildId || '0');

      // ----- /verification-message admin modal -----
      if (interaction.customId === 'verification_embed_modal') {
        const title = interaction.fields.getTextInputValue('embed_title');
        const description = interaction.fields.getTextInputValue('embed_description');
        const colorRaw = interaction.fields.getTextInputValue('embed_color') || '#00A2FF';
        const buttonLabel = interaction.fields.getTextInputValue('button_label') || 'Verify';

        let color = 0x00A2FF;
        try { color = parseInt(colorRaw.replace('#', ''), 16); } catch {}

        const embed = new EmbedBuilder()
          .setTitle(title)
          .setDescription(description)
          .setColor(color)
          .setFooter({ text: 'Roblox Verification' });

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('verify_start')
            .setLabel(buttonLabel)
            .setStyle(ButtonStyle.Success)
            .setEmoji('✅')
        );

        await interaction.reply({ content: `${settings.emojiSuccess} Verification message sent!`, flags: MessageFlags.Ephemeral });
        await interaction.channel.send({ embeds: [embed], components: [row] });
        return;
      }

      // ----- /embed command modal -----
      if (interaction.customId.startsWith('embed_create_')) {
        const channelId = interaction.customId.replace('embed_create_', '');
        const title = interaction.fields.getTextInputValue('title') || null;
        const description = interaction.fields.getTextInputValue('description') || null;
        const colorRaw = interaction.fields.getTextInputValue('color') || '#5865F2';
        const footer = interaction.fields.getTextInputValue('footer') || null;
        const image = interaction.fields.getTextInputValue('image') || null;

        let color = 0x5865F2;
        try { color = parseInt(colorRaw.replace('#', ''), 16); } catch {}

        const embed = new EmbedBuilder().setColor(color);
        if (title) embed.setTitle(title);
        if (description) embed.setDescription(description);
        if (footer) embed.setFooter({ text: footer });
        if (image) embed.setImage(image);

        const channel = await interaction.guild.channels.fetch(channelId).catch(() => interaction.channel);
        await channel.send({ embeds: [embed] });
        await interaction.reply({ content: `${settings.emojiSuccess} Embed sent!`, flags: MessageFlags.Ephemeral });
        return;
      }

      // ----- Verification Step 1: user submitted username -----
      if (interaction.customId === 'verify_step1_username') {
        const robloxUsername = interaction.fields.getTextInputValue('roblox_username').trim();
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();

        const verifyCmd = client.commands.get('verify');
        verifyCmd.pendingCodes.set(interaction.user.id, {
          code,
          robloxUsername,
          expires: Date.now() + 10 * 60 * 1000
        });

        const embed = new EmbedBuilder()
          .setTitle('Almost done!')
          .setDescription(
            `**1.** Go to your Roblox profile → **About**\n` +
            `**2.** Put this code in your description:\n\`\`\`${code}\`\`\`\n` +
            `**3.** Click the button below when you have saved it.`
          )
          .setColor(0x00A2FF)
          .setFooter({ text: 'Code expires in 10 minutes' });

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`verify_confirm_${interaction.user.id}`)
            .setLabel('I added the code to my bio')
            .setStyle(ButtonStyle.Success)
            .setEmoji('✅')
        );

        await interaction.reply({ embeds: [embed], components: [row], flags: MessageFlags.Ephemeral });
        return;
      }
    }

    // ===================== BUTTONS =====================
    if (interaction.isButton()) {
      const id = interaction.customId;
      const settings = await getSettings(interaction.guildId || '0');

      // Public Verify button → start the same flow as /verify
      if (id === 'verify_start') {
        const verifyCmd = client.commands.get('verify');
        if (verifyCmd) return verifyCmd.execute(interaction);
      }

      // User confirmed they added the code
      if (id.startsWith('verify_confirm_')) {
        const userId = id.replace('verify_confirm_', '');
        if (interaction.user.id !== userId) {
          return interaction.reply({ content: `${settings.emojiError} This button is not for you.`, flags: MessageFlags.Ephemeral });
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const verifyCmd = client.commands.get('verify');
        const pending = verifyCmd?.pendingCodes?.get(userId);

        if (!pending || Date.now() > pending.expires) {
          return interaction.editReply(`${settings.emojiError} Code expired. Please run /verify or click Verify again.`);
        }

        const { code, robloxUsername } = pending;

        try {
          // Find Roblox user
          const userRes = await fetch('https://users.roblox.com/v1/usernames/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usernames: [robloxUsername], excludeBannedUsers: true })
          });
          const userData = await userRes.json();

          if (!userData.data || userData.data.length === 0) {
            return interaction.editReply(`${settings.emojiError} Roblox user **${robloxUsername}** not found.`);
          }

          const robloxId = userData.data[0].id;

          // Check bio for the code
          const profileRes = await fetch(`https://users.roblox.com/v1/users/${robloxId}`);
          const profile = await profileRes.json();

          if (!profile.description || !profile.description.includes(code)) {
            return interaction.editReply(
              `${settings.emojiError} I couldn't find the code \`${code}\` in your Roblox About section.\n` +
              `Make sure you clicked Save and try again.`
            );
          }

          // Save to DB
          await db.query(
            `INSERT INTO users (discord_id, roblox_id, roblox_username, verified_at)
             VALUES (?, ?, ?, NOW())
             ON DUPLICATE KEY UPDATE roblox_id = VALUES(roblox_id), roblox_username = VALUES(roblox_username), verified_at = NOW()`,
            [userId, String(robloxId), robloxUsername]
          );

          // Nickname + Verified role
          const member = await interaction.guild.members.fetch(userId).catch(() => null);
          if (member) {
            await member.setNickname(robloxUsername).catch(() => {});
            const role = await getVerifiedRole(interaction.guild);
            if (role) await member.roles.add(role).catch(() => {});
          }

          verifyCmd.pendingCodes.delete(userId);

          await interaction.editReply(`${settings.emojiSuccess} Successfully verified as **${robloxUsername}**!`);
        } catch (err) {
          console.error('Verification error:', err);
          await interaction.editReply(`${settings.emojiError} Something went wrong. Please try again.`);
        }
        return;
      }

      // Reaction role buttons
      if (id.startsWith('rr_')) {
        const roleId = id.replace('rr_', '');
        const member = interaction.member;
        if (!member) return;
        try {
          if (member.roles.cache.has(roleId)) {
            await member.roles.remove(roleId);
            await interaction.reply({ content: `${settings.emojiSuccess} Role removed.`, flags: MessageFlags.Ephemeral });
          } else {
            await member.roles.add(roleId);
            await interaction.reply({ content: `${settings.emojiSuccess} Role added.`, flags: MessageFlags.Ephemeral });
          }
        } catch (e) {
          await interaction.reply({ content: `${settings.emojiError} Could not toggle role (check hierarchy).`, flags: MessageFlags.Ephemeral });
        }
        return;
      }

      // Modmail
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
          return interaction.followUp({ content: `${config.emojiError} No suitable server found for modmail.`, flags: MessageFlags.Ephemeral });
        }

        const banned = await db.query('SELECT 1 FROM modmail_bans WHERE guild_id = ? AND user_id = ?', [targetGuild.id, interaction.user.id]);
        if (banned.length) {
          return interaction.followUp({ content: `${config.emojiError} You are banned from modmail.`, flags: MessageFlags.Ephemeral });
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
        await interaction.followUp({ content: `${config.emojiSuccess} Ticket created! Staff will reply soon.`, flags: MessageFlags.Ephemeral });
        return;
      }

      if (id === 'modmail_cancel') {
        await interaction.update({ content: 'Cancelled.', components: [] });
      }
    }
  }
};
