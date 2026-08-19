const { SlashCommandBuilder, AttachmentBuilder, PermissionFlagsBits } = require('discord.js');
const { getSettings } = require('../../utils/guildSettings');

const WATERMARK = 'I DONT LIKE WHEN U READ MY CODE';
const PROMETHEUS_HEADER = `--[[
  Obfuscated with Lumen Bot
  Inspired by: https://github.com/prometheus-lua/Prometheus
  ${WATERMARK}
]]`;

function simpleObfuscate(code) {
  // Basic string/name mangling (not full Prometheus — that requires Lua runtime)
  const lines = code.split('\n').filter(l => !l.trim().startsWith('--') || l.includes(WATERMARK));
  let out = PROMETHEUS_HEADER + '\n\n';
  out += `-- ${WATERMARK}\n`;
  out += `-- Do not redistribute\n\n`;

  // Hex-encode string literals roughly
  let transformed = code;
  transformed = transformed.replace(/(["'])(?:(?!\1)[^\\]|\\.)*\1/g, (str) => {
    try {
      const quote = str[0];
      const inner = str.slice(1, -1);
      if (inner.length < 2) return str;
      const hex = Buffer.from(inner, 'utf8').toString('hex');
      return `(function() local h="${hex}"; local s=""; for i=1,#h,2 do s=s..string.char(tonumber(h:sub(i,i+1),16)) end return s end)()`;
    } catch {
      return str;
    }
  });

  out += transformed;
  out += `\n\n-- ${WATERMARK}\n`;
  out += `-- https://github.com/prometheus-lua/Prometheus\n`;
  return out;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('obfuscate')
    .setDescription('Obfuscate a Lua script (adds watermark + light obfuscation)')
    .addAttachmentOption(o =>
      o.setName('file').setDescription('Lua file to obfuscate').setRequired(false)
    )
    .addStringOption(o =>
      o.setName('code').setDescription('Paste Lua code directly').setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    const settings = await getSettings(interaction.guildId);
    const file = interaction.options.getAttachment('file');
    const codeOpt = interaction.options.getString('code');

    await interaction.deferReply({ ephemeral: true });

    let source = codeOpt;
    if (file) {
      if (!file.name.endsWith('.lua') && !file.name.endsWith('.txt')) {
        return interaction.editReply(`${settings.emojiError} Please upload a .lua or .txt file.`);
      }
      if (file.size > 500_000) {
        return interaction.editReply(`${settings.emojiError} File too large (max 500KB).`);
      }
      const res = await fetch(file.url);
      source = await res.text();
    }

    if (!source || !source.trim()) {
      return interaction.editReply(`${settings.emojiError} Provide either a file or paste code.`);
    }

    const obfuscated = simpleObfuscate(source);
    const buffer = Buffer.from(obfuscated, 'utf8');
    const attachment = new AttachmentBuilder(buffer, { name: 'obfuscated.lua' });

    await interaction.editReply({
      content:
        `${settings.emojiSuccess} Obfuscated.\n` +
        `Watermark: \`${WATERMARK}\`\n` +
        `Header: [Prometheus](https://github.com/prometheus-lua/Prometheus)`,
      files: [attachment]
    });
  }
};
