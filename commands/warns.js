const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { embedToContainer } = require('../utils/embeds');
const { warnKey } = require('../utils/warns');
const { WarnModel } = require('../utils/db');

module.exports = {
    requiereStaff: true,
    data: new SlashCommandBuilder()
        .setName('warns')
        .setDescription('Gestiona el historial de advertencias de un miembro')
        .addSubcommand(sub =>
            sub.setName('view')
               .setDescription('Consulta el historial de advertencias')
               .addUserOption(opt => opt.setName('usuario').setDescription('El miembro a consultar').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('clear')
               .setDescription('Limpia el historial de advertencias de un miembro')
               .addUserOption(opt => opt.setName('usuario').setDescription('El miembro a limpiar').setRequired(true))
        ),

    async execute(interaction) {
        const { options, guild, user } = interaction;
        const usuario = options.getMember('usuario');

        if (!usuario) return interaction.reply({ content: '❌ El objetivo especificado no se encuentra en el servidor.', ephemeral: true });
        const sub = options.getSubcommand();
        const idWarn = warnKey(guild.id, usuario.id);

        try {
            const registroWarns = await WarnModel.findOne({ key: idWarn });
            const usuarioWarns = registroWarns ? registroWarns.warns : [];

            if (sub === 'view') {
                const embed = new EmbedBuilder()
                    .setThumbnail(usuario.user.displayAvatarURL({ dynamic: true }))
                    .setTimestamp();

                if (usuarioWarns.length === 0) {
                    embed.setTitle('📋 Historial de Advertencias')
                         .setColor('#57F287')
                         .addFields(
                            { name: 'Miembro', value: `${usuario.user.username}`, inline: true },
                            { name: 'Estado', value: 'Sin advertencias', inline: true }
                         );
                    return interaction.reply({ components: [embedToContainer(embed)], flags: MessageFlags.IsComponentsV2 });
                }

                embed.setTitle('📋 Historial de Advertencias')
                     .setColor('#F2A30F')
                     .addFields(
                        { name: 'Miembro', value: `${usuario.user.username}`, inline: true },
                        { name: 'Total', value: `${usuarioWarns.length}`, inline: true }
                     );

                usuarioWarns.forEach((w, index) => {
                    embed.addFields({
                        name: `#${index + 1} —${w.fecha}`,
                        value: `Mod: ${w.moderador} • Razón: ${w.razon}`
                    });
                });

                return interaction.reply({ components: [embedToContainer(embed)], flags: MessageFlags.IsComponentsV2 });
            }

            if (sub === 'clear') {
                if (usuarioWarns.length === 0) {
                    return interaction.reply({ content: `ℹ️ **${usuario.user.username}** ya no tiene advertencias registradas.`, ephemeral: true });
                }

                await WarnModel.deleteOne({ key: idWarn });

                const embed = new EmbedBuilder()
                    .setTitle('🧹 Historial Limpiado')
                    .setColor('#57F287')
                    .addFields(
                        { name: 'Miembro', value: `${usuario.user.username}`, inline: true },
                        { name: 'Moderador', value: `${user.username}`, inline: true }
                    )
                    .setFooter({ text: 'CPU v2' })
                    .setTimestamp();

                return interaction.reply({ components: [embedToContainer(embed)], flags: MessageFlags.IsComponentsV2 });
            }
        } catch (error) {
            console.error('Error en /warns:', error);
            return interaction.reply({ content: '❌ Ocurrió un error al procesar la solicitud con MongoDB.', ephemeral: true });
        }
    }
};
