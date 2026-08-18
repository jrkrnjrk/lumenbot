const { Events, MessageFlags, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ChannelType } = require('discord.js');
const db = require('../database');
const config = require('../config');
const { getSettings } = require('../utils/guildSettings');

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

      if (id === 'verify_button') {
        const verifyCmd = client.commands.get('verification-message');
        if (verifyCmd && verifyCmd.handleButton) {
          return verifyCmd.handleButton(interaction, client);
        }
      }

      if (id.startsWith('rr_')) {
        const roleId = id.replace('rr_', '');
        const member = interaction.member;
        if (!member) return;
        try {
          if (member.roles.cache.has(roleId)) {
            await member.roles.remove(roleId);
            await interaction.reply({ content: `${config.emojiSuccess} Role removed.`, flags: MessageFlags.Ephemeral });
          } else {
            await member.roles.add(roleId);
            await interaction.reply({ content: `${config.emojiSuccess} Role added.`, flags: MessageFlags.Ephemeral });
          }
        } catch (e) {
          await interaction.reply({ content: `${config.emojiError} Could not toggle role (check hierarchy).`, flags: MessageFlags.Ephemeral });
        }
      }

      // User clicked "Yes, open a ticket" in DM
      if (id === 'modmail_create') {
        await interaction.deferUpdate();

        // Find ALL mutual guilds that are waitlisted + modmail enabled
        const options = [];
        for (const [guildId, guild] of client.guilds.cache) {
          try {
            // Check membership properly (fetch if needed)
            const member = await guild.members.fetch(interaction.user.id).catch(() => null);
            if (!member) continue;

            const settings = await db.getGuildSettings(guildId);
            if (!settings || !settings.waitlisted) continue;
            if (settings.modmail_enabled === 0 || settings.modmail_enabled === false) continue;

            // Check if banned in this guild
            const banned = await db.query(
              'SELECT 1 FROM modmail_bans WHERE guild_id = ? AND user_id = ?',
              [guildId, interaction.user.id]
            );
            if (banned.length) continue;

            options.push({
              label: guild.name.slice(0, 100),
              description: `Open a ticket in ${guild.name}`.slice(0, 100),
              value: guildId
            });
          } catch {
            continue;
          }
        }

        if (options.length === 0) {
          return interaction.followUp({
            content: `${config.emojiError} No suitable server found for modmail.\nMake sure the bot is in a server you are in, the server is waitlisted, and modmail is enabled.`,
            ephemeral: true
          });
        }

        // Discord select menus max 25 options
        const limited = options.slice(0, 25);

        const select = new StringSelectMenuBuilder()
          .setCustomId('modmail_select_server')
          .setPlaceholder('Choose a server to open a ticket in')
          .addOptions(limited);

        const row = new ActionRowBuilder().addComponents(select);

        await interaction.followUp({
          content: 'Select the server you want to open a modmail ticket in:',
          components: [row],
          ephemeral: true
        });
      }

      if (id === 'modmail_cancel') {
        await interaction.update({ content: 'Cancelled.', components: [] });
      }
    }

    // ===== Select menus (server picker for modmail) =====
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === 'modmail_select_server') {
        await interaction.deferUpdate();
        const guildId = interaction.values[0];
        const targetGuild = client.guilds.cache.get(guildId);

        if (!targetGuild) {
          return interaction.followUp({ content: `${config.emojiError} Server not found.`, ephemeral: true });
        }

        // Double-check ban
        const banned = await db.query(
          'SELECT 1 FROM modmail_bans WHERE guild_id = ? AND user_id = ?',
          [guildId, interaction.user.id]
        );
        if (banned.length) {
          return interaction.followUp({ content: `${config.emojiError} You are banned from modmail in that server.`, ephemeral: true });
        }

        // Already has open ticket?
        const existing = await db.query(
          'SELECT 1 FROM modmail_tickets WHERE user_id = ? AND status = "open" LIMIT 1',
          [interaction.user.id]
        );
        if (existing.length) {
          return interaction.followUp({ content: `${config.emojiError} You already have an open ticket.`, ephemeral: true });
        }

        const guildSettings = await db.getGuildSettings(guildId);

        // Prefer category ID from dashboard, else name, else create
        let category = null;
        if (guildSettings?.modmail_category_id) {
          category = targetGuild.channels.cache.get(guildSettings.modmail_category_id);
        }
        if (!category) {
          category = targetGuild.channels.cache.find(c => c.name === config.modmailCategoryName && c.type === ChannelType.GuildCategory);
        }
        if (!category) {
          category = await targetGuild.channels.create({
            name: config.modmailCategoryName,
            type: ChannelType.GuildCategory
          });
        }

        const channel = await targetGuild.channels.create({
          name: `modmail-${interaction.user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 90),
          type: ChannelType.GuildText,
          parent: category.id,
          topic: `Modmail for ${interaction.user.tag} (${interaction.user.id})`
        });

        await db.query(
          'INSERT INTO modmail_tickets (guild_id, user_id, channel_id) VALUES (?, ?, ?)',
          [guildId, interaction.user.id, channel.id]
        );

        await channel.send(
          `📩 New modmail ticket from <@${interaction.user.id}> (\`${interaction.user.id}\`)\n` +
          `Server: **${targetGuild.name}**\nAnything said here will be sent to the user.`
        );

        await interaction.followUp({
          content: `${config.emojiSuccess} Ticket created in **${targetGuild.name}**! Staff will reply soon.`,
          ephemeral: true
        });
      }
    }

    // ===== Modal submissions (embed create / modify) =====
    if (interaction.isModalSubmit()) {
      const id = interaction.customId;
      const settings = await getSettings(interaction.guildId);

      if (id.startsWith('embed_create_')) {
        const channelId = id.replace('embed_create_', '');
        const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
        if (!channel) {
          return interaction.reply({ content: `${settings.emojiError} Channel not found.`, ephemeral: true });
        }

        const title = interaction.fields.getTextInputValue('title') || null;
        const description = interaction.fields.getTextInputValue('description') || null;
        const colorRaw = interaction.fields.getTextInputValue('color') || '#5865F2';
        const footer = interaction.fields.getTextInputValue('footer') || null;
        const image = interaction.fields.getTextInputValue('image') || null;
        const color = parseInt(colorRaw.replace('#', ''), 16) || 0x5865F2;

        const embed = new EmbedBuilder().setColor(color);
        if (title) embed.setTitle(title);
        if (description) embed.setDescription(description);
        if (footer) embed.setFooter({ text: footer });
        if (image) embed.setImage(image);

        try {
          await channel.send({ embeds: [embed] });
          await interaction.reply({ content: `${settings.emojiSuccess} Embed sent in ${channel}.`, ephemeral: true });
        } catch (err) {
          await interaction.reply({ content: `${settings.emojiError} Failed: ${err.message}`, ephemeral: true });
        }
      }

      if (id.startsWith('embed_modify_')) {
        const parts = id.replace('embed_modify_', '').split('_');
        const channelId = parts[0];
        const messageId = parts[1];
        const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
        if (!channel) {
          return interaction.reply({ content: `${settings.emojiError} Channel not found.`, ephemeral: true });
        }

        try {
          const message = await channel.messages.fetch(messageId);
          if (message.author.id !== interaction.client.user.id) {
            return interaction.reply({ content: `${settings.emojiError} That message was not sent by me.`, ephemeral: true });
          }
          const oldEmbed = message.embeds[0];
          if (!oldEmbed) {
            return interaction.reply({ content: `${settings.emojiError} That message has no embed.`, ephemeral: true });
          }

          const title = interaction.fields.getTextInputValue('title');
          const description = interaction.fields.getTextInputValue('description');
          const colorRaw = interaction.fields.getTextInputValue('color');
          const footer = interaction.fields.getTextInputValue('footer');
          const image = interaction.fields.getTextInputValue('image');

          const embed = EmbedBuilder.from(oldEmbed);
          if (title) embed.setTitle(title);
          if (description) embed.setDescription(description);
          if (colorRaw) {
            const color = parseInt(colorRaw.replace('#', ''), 16);
            if (!isNaN(color)) embed.setColor(color);
          }
          if (footer) embed.setFooter({ text: footer });
          if (image) embed.setImage(image);

          await message.edit({ embeds: [embed] });
          await interaction.reply({ content: `${settings.emojiSuccess} Embed updated.`, ephemeral: true });
        } catch (err) {
          await interaction.reply({ content: `${settings.emojiError} Failed: ${err.message}`, ephemeral: true });
        }
      }
    }
  }
};
