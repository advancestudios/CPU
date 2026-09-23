const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { embedToContainer, logModeracion } = require('../utils/embeds');
const { warnKey } = require('../utils/warns');
const { WarnModel } = require('../utils/db');

module.exports = {
    requiereStaff: true,
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Registra una advertencia formal')
        .addUserOption(opt => opt.setName('usuario').setDescription('El miembro a advertir').setRequired(true))
        .addStringOption(opt => opt.setName('razon').setDescription('Motivo')),

    async execute(interaction) {
        const { options, guild, user } = interaction;
        const usuario = options.getMember('usuario');
        const razon = options.getString('razon') || 'Ninguna especificada.';

        if (!usuario) return interaction.reply({ content: '❌ El objetivo especificado no se encuentra en el servidor.', ephemeral: true });
        if (usuario.user.bot) return interaction.reply({ content: '❌ Los perfiles automatizados (bots) no pueden recibir amonestaciones.', ephemeral: true });

        try {
            const idWarn = warnKey(guild.id, usuario.id);
            const nuevaAdvertencia = {
                moderador: user.tag,
                razon: razon,
                fecha: new Date().toLocaleDateString()
            };

            const registro = await WarnModel.findOneAndUpdate(
                { key: idWarn },
                { $push: { warns: nuevaAdvertencia } },
                { new: true, upsert: true }
            );

            const totalWarns = registro.warns.length;

            const embed = new EmbedBuilder()
                .setTitle('<:warn_icon:1552150324154998804> Miembro Advertido')
                .setColor('#ffae00')
                .setThumbnail(usuario.user.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: 'Miembro Advertido', value: `${usuario.user.username}`, inline: true },
                    { name: 'Historial de Warns', value: `${totalWarns}`, inline: true },
                    { name: 'Razón', value: razon, inline: false }
                )
                .setFooter({ text: 'CPU v2' })
                .setTimestamp();

            await logModeracion(guild, embed);
            return interaction.reply({ components: [embedToContainer(embed)], flags: MessageFlags.IsComponentsV2 });
        } catch (error) {
            console.error('Error en /warn:', error);
            return interaction.reply({ content: '❌ Ocurrió un error al registrar la advertencia en MongoDB.', ephemeral: true });
        }
    }
};
