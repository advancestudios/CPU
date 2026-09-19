const { EmbedBuilder, MessageFlags } = require('discord.js');
const { esMiembroStaff } = require('../utils/config');
const { embedToContainer, logModeracion } = require('../utils/embeds');

module.exports = {
    name: 'softban',
    async execute(message, args) {
        if (!esMiembroStaff(message.member, message.guild.id)) {
            return message.reply({ content: '❌ Acceso denegado: Requieres ser Staff o tener permisos de Administrador.' });
        }

        const usuario = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
        if (!usuario) {
            return message.reply({ content: '⚠️ **Uso correcto:** `;softban @usuario [segundos_borrado] [razón]`' });
        }

        if (!usuario.bannable) {
            return message.reply({ content: '❌ Operación denegada: El miembro posee inmunidad o un rol superior.' });
        }

        let segundosBorrar = parseInt(args[1], 10);
        let razon = args.slice(2).join(' ');

        if (isNaN(segundosBorrar)) {
            segundosBorrar = 86400;
            razon = args.slice(1).join(' ') || 'Softban aplicado vía comando con prefijo.';
        } else {
            razon = razon || 'Softban aplicado vía comando con prefijo.';
        }

        if (segundosBorrar > 604800) segundosBorrar = 604800;

        const embed = new EmbedBuilder()
            .setTitle('🧹 Miembro Expulsado (Softban)')
            .setColor('#ED4245')
            .setThumbnail(usuario.user.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: 'Miembro', value: `${usuario.user.username}`, inline: true },
                { name: 'Moderador', value: `${message.author.username}`, inline: true },
                { name: 'Razón', value: razon, inline: false }
            )
            .setFooter({ text: 'CPU v2' })
            .setTimestamp();

        try {
            await message.guild.members.ban(usuario.id, { reason: razon, deleteMessageSeconds: segundosBorrar });
            await message.guild.members.unban(usuario.id, 'Softban: se libera el baneo tras purgar mensajes').catch(() => {});
            await logModeracion(message.guild, embed);

            return message.reply({ components: [embedToContainer(embed)], flags: MessageFlags.IsComponentsV2 });
        } catch (error) {
            console.error('Error al ejecutar softban por prefijo:', error);
            return message.reply({ content: '❌ Ocurrió un error al intentar aplicar el softban.' });
        }
    }
};
