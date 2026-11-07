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

        if (!usuario) return interaction.reply({ content: '<:x_icon:1553581267600146483> El objetivo especificado no se encuentra en el servidor.', ephemeral: true });
        const sub = options.getSubcommand();
        const idWarn = warnKey(guild.id, usuario.id);

        await interaction.deferReply();

        try {
            const registroWarns = await WarnModel.findOne({ key: idWarn });
            const usuarioWarns = registroWarns ? registroWarns.warns : [];

            if (sub === 'view') {
                const embed = new EmbedBuilder()
                    .setThumbnail(usuario.user.displayAvatarURL({ dynamic: true }))
                    .setTimestamp();

                if (usuarioWarns.length === 0) {
                    embed.setTitle('📋 Historial de Advertencias')
                         .addFields(
                            { name: 'Miembro', value: `${usuario}`, inline: true },
                            { name: 'Estado', value: 'Sin advertencias', inline: true }
                         );
                    return interaction.editReply({ components: [embedToContainer(embed)], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } });
                }

                embed.setTitle('📋 Historial de Advertencias')
                     .addFields(
                        { name: 'Miembro', value: `${usuario}`, inline: true },
                        { name: 'Total', value: `${usuarioWarns.length}`, inline: true }
                     );

                const MAX_MOSTRAR = 10; // Discord limita el texto total de un mensaje a 4000 caracteres
                const inicio = Math.max(0, usuarioWarns.length - MAX_MOSTRAR);
                usuarioWarns.slice(inicio).forEach((w, i) => {
                    embed.addFields({
                        name: `#${inicio + i + 1} — ${w.fecha}`,
                        value: `Mod: ${w.moderador} • Razón: ${String(w.razon).slice(0, 200)}`
                    });
                });
                if (inicio > 0) embed.setFooter({ text: `Mostrando las últimas ${MAX_MOSTRAR} de ${usuarioWarns.length}` });

                return interaction.editReply({ components: [embedToContainer(embed)], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } });
            }

            if (sub === 'clear') {
                if (usuarioWarns.length === 0) {
                    return interaction.editReply({ content: `ℹ️ **${usuario.user.username}** no tiene advertencias registradas.` });
                }

                await WarnModel.deleteOne({ key: idWarn });

                const embed = new EmbedBuilder()
                    .setTitle('🧹 Historial Limpiado')
                    .addFields(
                        { name: 'Miembro', value: `${usuario}`, inline: true },
                        { name: 'Moderador', value: `${user}`, inline: true }
                    )
                    .setFooter({ text: 'CPU v2' })
                    .setTimestamp();

                return interaction.editReply({ components: [embedToContainer(embed)], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } });
            }
        } catch (error) {
            console.error('Error en /warns:', error);
            return interaction.editReply({ content: '<:x_icon:1553581267600146483> Ocurrió un error al procesar la solicitud con MongoDB.' });
        }
    }
};
