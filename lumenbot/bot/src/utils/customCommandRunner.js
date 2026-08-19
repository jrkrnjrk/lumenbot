/**
 * Runs custom command responses with placeholders and optional embed JSON.
 *
 * Placeholders:
 *   {user} {user.tag} {user.id} {user.mention}
 *   {server} {server.id} {server.members}
 *   {channel} {channel.id}
 *   {args} {args1} {args2} ...
 *   {random:a|b|c}
 *
 * If response starts with EMBED|, the rest is JSON for an embed.
 * If response starts with CODE|, the rest is a small sandboxed script that must return a string or embed object.
 */

const vm = require('vm');
const { EmbedBuilder } = require('discord.js');

function applyPlaceholders(template, ctx) {
  let out = template;

  out = out.replace(/\{user\.mention\}/gi, `<@${ctx.user.id}>`);
  out = out.replace(/\{user\.tag\}/gi, ctx.user.tag);
  out = out.replace(/\{user\.id\}/gi, ctx.user.id);
  out = out.replace(/\{user\}/gi, ctx.user.username);

  out = out.replace(/\{server\.id\}/gi, ctx.guild?.id || '');
  out = out.replace(/\{server\.members\}/gi, String(ctx.guild?.memberCount || 0));
  out = out.replace(/\{server\}/gi, ctx.guild?.name || '');

  out = out.replace(/\{channel\.id\}/gi, ctx.channel?.id || '');
  out = out.replace(/\{channel\}/gi, ctx.channel?.name || '');

  out = out.replace(/\{args\}/gi, ctx.args.join(' '));
  ctx.args.forEach((a, i) => {
    out = out.replace(new RegExp(`\\{args${i + 1}\\}`, 'gi'), a);
  });

  out = out.replace(/\{random:([^}]+)\}/gi, (_, list) => {
    const parts = list.split('|');
    return parts[Math.floor(Math.random() * parts.length)] || '';
  });

  return out;
}

function runCode(code, ctx) {
  const sandbox = {
    user: {
      id: ctx.user.id,
      tag: ctx.user.tag,
      username: ctx.user.username,
      mention: `<@${ctx.user.id}>`
    },
    server: {
      id: ctx.guild?.id,
      name: ctx.guild?.name,
      members: ctx.guild?.memberCount
    },
    channel: {
      id: ctx.channel?.id,
      name: ctx.channel?.name
    },
    args: ctx.args,
    Math,
    JSON,
    result: null
  };

  const script = new vm.Script(`
    (function() {
      ${code}
    })()
  `);

  const result = script.runInNewContext(sandbox, { timeout: 100 });
  return result;
}

async function runCustomCommand(response, message) {
  const ctx = {
    user: message.author,
    guild: message.guild,
    channel: message.channel,
    args: message.content.split(/\s+/).slice(1)
  };

  const trimmed = response.trim();

  // CODE| mode — return string or { title, description, color }
  if (trimmed.startsWith('CODE|')) {
    const code = trimmed.slice(5);
    try {
      const result = runCode(code, ctx);
      if (result == null) return null;
      if (typeof result === 'string') {
        return { content: applyPlaceholders(result, ctx) };
      }
      if (typeof result === 'object') {
        const embed = new EmbedBuilder();
        if (result.title) embed.setTitle(String(result.title));
        if (result.description) embed.setDescription(applyPlaceholders(String(result.description), ctx));
        if (result.color) {
          const c = String(result.color).replace('#', '');
          embed.setColor(parseInt(c, 16) || 0x5865F2);
        }
        return { embeds: [embed] };
      }
    } catch (e) {
      return { content: `Custom command error: ${e.message}` };
    }
  }

  // EMBED| mode — JSON embed
  if (trimmed.startsWith('EMBED|')) {
    try {
      const raw = applyPlaceholders(trimmed.slice(6), ctx);
      const data = JSON.parse(raw);
      const embed = new EmbedBuilder();
      if (data.title) embed.setTitle(data.title);
      if (data.description) embed.setDescription(data.description);
      if (data.color) {
        const c = String(data.color).replace('#', '');
        embed.setColor(parseInt(c, 16) || 0x5865F2);
      }
      if (data.footer) embed.setFooter({ text: data.footer });
      if (data.image) embed.setImage(data.image);
      if (data.thumbnail) embed.setThumbnail(data.thumbnail);
      return { embeds: [embed] };
    } catch (e) {
      return { content: `Invalid embed JSON: ${e.message}` };
    }
  }

  // Plain text with placeholders
  return { content: applyPlaceholders(trimmed, ctx) };
}

module.exports = { runCustomCommand, applyPlaceholders };
