const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { embedToContainer, logModeracion } = require('../utils/embeds');

module.exports = {
    requiereStaff: true,
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Aísla/Silencia temporalmente a un miembro')
        .addUserOption(opt => opt.setName('usuario').setDescription('El miembro a aislar').setRequired(true))
        .addIntegerOption(opt =>
            opt.setName('minutos')
                .setDescription('Duración del aislamiento')
                .setRequired(true)
                .addChoices(
                    { name: '1 Minuto', value: 1 },
                    { name: '5 Minutos', value: 5 },
                    { name: '10 Minutos', value: 10 },
                    { name: '1 Hora', value: 60 },
                    { name: '1 Día', value: 1440 },
                    { name: '1 Semana', value: 10080 }
                )
        )
        .addStringOption(opt => opt.setName('razon').setDescription('Motivo detallado')),

    async execute(interaction) {
        const { options, guild, user } = interaction;
        const usuario = options.getMember('usuario');
        const razon = options.getString('razon') || 'Ninguna especificada.';

        if (!usuario) return interaction.reply({ content: '❌ El objetivo especificado no se encuentra en el servidor.', ephemeral: true });
        const minutes = options.getInteger('minutos');
        if (!usuario.moderatable) return interaction.reply({ content: '❌ Operación denegada: Imposible aplicar aislamiento a este rango.', ephemeral: true });

        try {
            await usuario.timeout(minutes * 60 * 1000, razon);

            const embed = new EmbedBuilder()
                .setTitle('🔇 Miembro Silenciado')
                .setColor('#FEE75C')
                .setThumbnail(usuario.user.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: 'Miembro', value: `${usuario.user.username}`, inline: true },
                    { name: 'Duración', value: `${minutes} min`, inline: true },
                    { name: 'Moderador', value: `${user.username}`, inline: true },
                    { name: 'Razón', value: razon, inline: false }
                )
                .setFooter({ text: 'CPU v2' })
                .setTimestamp();

            await logModeracion(guild, embed);
            return interaction.reply({ components: [embedToContainer(embed)], flags: MessageFlags.IsComponentsV2 });
        } catch (error) {
            console.error('Error en /mute:', error);
            return interaction.reply({ content: '❌ Ocurrió un error al intentar silenciar al miembro.', ephemeral: true });
        }
    }
};
