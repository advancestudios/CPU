const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { embedToContainer, logModeracion } = require('../utils/embeds');

module.exports = {
    requiereStaff: true,
    data: new SlashCommandBuilder()
        .setName('softban')
        .setDescription('Expulsa al usuario y borra sus mensajes recientes, sin banearlo permanentemente')
        .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a expulsar').setRequired(true))
        .addStringOption(opt => opt.setName('razon').setDescription('Razón de la expulsión').setRequired(false))
        .addStringOption(opt => opt.setName('borrar-mensajes').setDescription('Mensajes a eliminar (por defecto, ninguno)').setRequired(false)
            .addChoices(
                { name: 'Última 1 hora', value: '3600' },
                { name: 'Últimas 6 horas', value: '21600' },
                { name: 'Últimas 12 horas', value: '43200' },
                { name: 'Último 1 día', value: '86400' },
                { name: 'Últimos 3 días', value: '259200' },
                { name: 'Últimos 7 días', value: '604800' }
            )),

    async execute(interaction) {
        const { options, guild, user } = interaction;
        const usuario = options.getMember('usuario');
        const razon = options.getString('razon') || 'Ninguna especificada.';

        if (!usuario) return interaction.reply({ content: '❌ El objetivo especificado no se encuentra en el servidor.', ephemeral: true });
        if (!usuario.bannable) return interaction.reply({ content: '❌ Operación denegada: El miembro posee inmunidad o un rol superior.', ephemeral: true });

        const segundosBorrar = parseInt(options.getString('borrar-mensajes') || '0', 10);

        const embed = new EmbedBuilder()
            .setTitle('🧹 Miembro Expulsado (Softban)')
            .setColor('#ED4245')
            .setThumbnail(usuario.user.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: 'Miembro', value: `${usuario.user.username}`, inline: true },
                { name: 'Moderador', value: `${user.username}`, inline: true },
                { name: 'Razón', value: razon, inline: false }
            )
            .setFooter({ text: 'CPU v2' })
            .setTimestamp();

        try {
            await guild.members.ban(usuario.id, { reason: razon, deleteMessageSeconds: segundosBorrar });
            await guild.members.unban(usuario.id, 'Softban: se libera el baneo tras limpiar mensajes').catch(() => {});
            await logModeracion(guild, embed);
            return interaction.reply({ components: [embedToContainer(embed)], flags: MessageFlags.IsComponentsV2 });
        } catch (error) {
            console.error('Error en /softban:', error);
            return interaction.reply({ content: '❌ Ocurrió un error al intentar aplicar el softban.', ephemeral: true });
        }
    }
};
