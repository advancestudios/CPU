const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { embedToContainer, logModeracion } = require('../utils/embeds');

module.exports = {
    requiereStaff: true,
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Expulsa a un miembro del servidor')
        .addUserOption(opt => opt.setName('usuario').setDescription('El miembro a expulsar').setRequired(true))
        .addStringOption(opt => opt.setName('razon').setDescription('Motivo detallado')),

    async execute(interaction) {
        const { options, guild, user } = interaction;
        const usuario = options.getMember('usuario');
        const razon = options.getString('razon') || 'Ninguna especificada.';

        if (!usuario) return interaction.reply({ content: '❌ El objetivo especificado no se encuentra en el servidor.', ephemeral: true });
        if (!usuario.kickable) return interaction.reply({ content: '❌ Operación denegada: Privilegios insuficientes o jerarquía superior.', ephemeral: true });

        try {
            await usuario.kick(razon);

            const embed = new EmbedBuilder()
                .setTitle('<:kick_icon:1552295636144103506> Miembro Expulsado')
                .setThumbnail(usuario.user.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: 'Miembro', value: `${usuario.user.username}`, inline: true },
                    { name: 'Moderador', value: `${user.username}`, inline: true },
                    { name: 'Razón', value: razon, inline: false }
                )
                .setFooter({ text: 'CPU v2' })
                .setTimestamp();

            await logModeracion(guild, embed);
            return interaction.reply({ components: [embedToContainer(embed)], flags: MessageFlags.IsComponentsV2 });
        } catch (error) {
            console.error('Error en /kick:', error);
            return interaction.reply({ content: '❌ Ocurrió un error al intentar expulsar al miembro.', ephemeral: true });
        }
    }
};
