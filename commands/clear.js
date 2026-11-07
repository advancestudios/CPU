const { SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
    requiereStaff: true,
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Limpia mensajes masivamente')
        .addIntegerOption(opt => opt.setName('cantidad').setDescription('Cantidad (1-10000)').setRequired(true).setMinValue(1).setMaxValue(10000)),

    async execute(interaction) {
        const { options, channel } = interaction;
        const cantidad = options.getInteger('cantidad');

        // Borrar muchos mensajes tarda más de 3 s: se avisa a Discord primero
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        let restantes = cantidad;
        let total = 0;
        try {
            // Discord solo deja borrar hasta 100 mensajes por llamada (y menores de 14 días)
            while (restantes > 0) {
                const lote = Math.min(restantes, 100);
                const borrados = await channel.bulkDelete(lote, true);
                total += borrados.size;
                restantes -= lote;
                if (borrados.size < lote) break; // no quedan más mensajes borrables
            }
        } catch (error) {
            console.error('Error en /clear:', error);
            return interaction.editReply({ content: total
                ? `<:warn_icon:1552150324154998804> Se borraron **${total}** mensajes y luego ocurrió un error (revisa que tenga el permiso "Gestionar Mensajes").`
                : '<:x_icon:1553581267600146483> No pude borrar mensajes. Revisa que tenga el permiso "Gestionar Mensajes" en este canal.' });
        }

        if (total === 0) {
            return interaction.editReply({ content: 'ℹ️ No había mensajes para borrar (Discord no permite borrar mensajes de más de 14 días).' });
        }
        const nota = total < cantidad ? ' Los demás tienen más de 14 días y Discord no permite borrarlos.' : '';
        return interaction.editReply({ content: `<:check_icon:1553581296398114846> **Mantenimiento Completado:** Se han purgado **${total} mensajes** del canal.${nota}` });
    }
};
