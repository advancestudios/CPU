const { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { esMiembroStaff } = require('../utils/config');
const { embedToContainer, construirEmbedTicket } = require('../utils/embeds');

module.exports = {
    customId: 'tomar_ticket',
    async execute(interaction) {
        const { guild, member, channel } = interaction;

        if (!esMiembroStaff(member, guild.id)) {
            return interaction.reply({ content: '❌ No tienes permiso para tomar este ticket.', ephemeral: true });
        }

        const topic = channel.topic || '';
        const ownerId = topic.startsWith('ticket-owner:') ? topic.split(':')[1] : null;
        const ownerMember = ownerId ? await guild.members.fetch(ownerId).catch(() => null) : null;
        const nombreUsuario = ownerMember ? ownerMember.user.username : 'Usuario';

        try {
            const embedActualizado = construirEmbedTicket(nombreUsuario, member.user.username);
            const filaSoloCerrar = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('cerrar_ticket').setLabel('Cerrar Ticket').setEmoji('🔒').setStyle(ButtonStyle.Danger)
            );
            return interaction.update({ components: [embedToContainer(embedActualizado), filaSoloCerrar], flags: MessageFlags.IsComponentsV2 });
        } catch (e) {
            console.error('Error al tomar ticket:', e);
            return interaction.reply({ content: '❌ No pude actualizar el ticket.', ephemeral: true });
        }
    }
};
