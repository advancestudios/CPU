const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    PermissionFlagsBits,
    TextDisplayBuilder,
    MessageFlags
} = require('discord.js');
const { getGuildConfig } = require('./config');
const { embedToContainer, construirEmbedTicket } = require('./embeds');

// Crea el canal de ticket para "member". abiertoPor es quien lo originó (el mismo usuario si usó el botón, o un Staff si usó /open).
// Devuelve { ok: true, channel } o { ok: false, motivo }.
async function crearTicket(guild, member, abiertoPor) {
    const cfg = getGuildConfig(guild.id);
    if (!cfg.ticketsCategory) {
        return { ok: false, motivo: '⚠️ El sistema de tickets no ha sido configurado. Pide a un administrador usar `/setup tickets`.' };
    }

    const categoria = guild.channels.cache.get(cfg.ticketsCategory);
    if (!categoria) {
        return { ok: false, motivo: '⚠️ La categoría configurada ya no existe. Pide a un administrador reconfigurarla con `/setup tickets`.' };
    }

    const ticketExistente = categoria.children.cache.find(c => c.topic === `ticket-owner:${member.id}`);
    if (ticketExistente) {
        return { ok: false, motivo: `⚠️ Ese usuario ya tiene un ticket abierto: <#${ticketExistente.id}>`, canalExistente: ticketExistente };
    }

    const nombreBase = member.user.username.toLowerCase().replace(/[^a-z0-9]/g, '') || member.id;

    const overwritesMap = new Map();
    overwritesMap.set(guild.roles.everyone.id, { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] });
    overwritesMap.set(member.id, { id: member.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });
    overwritesMap.set(guild.members.me.id, { id: guild.members.me.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ReadMessageHistory] });

    // Acceso automático para cualquier rol con Administrador o Gestionar Canales, aunque no se haya configurado /setup-rol-soporte
    guild.roles.cache.forEach(rolServidor => {
        if (rolServidor.permissions.has(PermissionFlagsBits.Administrator) || rolServidor.permissions.has(PermissionFlagsBits.ManageChannels)) {
            overwritesMap.set(rolServidor.id, { id: rolServidor.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });
        }
    });

    const rolNotif = cfg.staffRole || cfg.ticketsRole;
    if (rolNotif) {
        overwritesMap.set(rolNotif, { id: rolNotif, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });
    }

    const overwrites = Array.from(overwritesMap.values());

    let canalTicket;
    try {
        canalTicket = await guild.channels.create({
            name: `ticket-${nombreBase}`,
            type: ChannelType.GuildText,
            parent: categoria.id,
            topic: `ticket-owner:${member.id}`,
            permissionOverwrites: overwrites
        });
    } catch (error) {
        console.error('Error al crear canal de ticket:', error);
        return { ok: false, motivo: '❌ No pude crear el canal del ticket. Revisa mis permisos de Gestionar Canales.' };
    }

    const abiertoPorStaff = abiertoPor && abiertoPor.id !== member.id;
    const embedTicket = construirEmbedTicket(member.user.username, abiertoPorStaff ? abiertoPor.username : null);

    const botones = abiertoPorStaff
        ? [new ButtonBuilder().setCustomId('cerrar_ticket').setLabel('Cerrar Ticket').setEmoji('🔒').setStyle(ButtonStyle.Danger)]
        : [
            new ButtonBuilder().setCustomId('tomar_ticket').setLabel('Tomar Ticket').setEmoji('🖐️').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('cerrar_ticket').setLabel('Cerrar Ticket').setEmoji('🔒').setStyle(ButtonStyle.Danger)
        ];
    const rowTicket = new ActionRowBuilder().addComponents(...botones);

    const mencionStaff = rolNotif ? `<@&${rolNotif}>` : '';
    const textoMencion = `${mencionStaff} <@${member.id}>`.trim();
    await canalTicket.send({
        components: [
            new TextDisplayBuilder().setContent(textoMencion),
            embedToContainer(embedTicket),
            rowTicket
        ],
        flags: MessageFlags.IsComponentsV2
    });

    return { ok: true, channel: canalTicket };
}

module.exports = { crearTicket };
