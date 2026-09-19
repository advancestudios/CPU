const { PermissionFlagsBits, PermissionsBitField } = require('discord.js');

const PREFIX = ';';

// IDs de los creadores del bot (acceso a comandos exclusivos como ;setstatus)
const CREADORES_IDS = [
    '1306621378291564565',
    '1419053430697234603'
];

const BOT_INVITE_PERMISSIONS = new PermissionsBitField([
    PermissionFlagsBits.KickMembers,
    PermissionFlagsBits.BanMembers,
    PermissionFlagsBits.ManageChannels,
    PermissionFlagsBits.ManageRoles,
    PermissionFlagsBits.ModerateMembers,
    PermissionFlagsBits.ManageNicknames,
    PermissionFlagsBits.ManageMessages,
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.SendMessages,
    PermissionFlagsBits.EmbedLinks,
    PermissionFlagsBits.ReadMessageHistory,
    PermissionFlagsBits.CreateInstantInvite
]).bitfield.toString();

module.exports = { PREFIX, CREADORES_IDS, BOT_INVITE_PERMISSIONS };
