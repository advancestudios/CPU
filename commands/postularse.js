const {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    TextDisplayBuilder,
    MessageFlags
} = require('discord.js');
const { getGuildConfig } = require('../utils/config');
const { embedToContainer } = require('../utils/embeds');

module.exports = {
    requiereStaff: false,
    data: new SlashCommandBuilder()
        .setName('postularse')
        .setDescription('Inicia tu proceso de postulación mediante MD'),

    async execute(interaction) {
        const { guild, user } = interaction;
        const canalId = getGuildConfig(guild.id).postulaciones;

        if (!canalId) {
            return interaction.reply({
                content: '⚠️ El sistema de postulaciones no ha sido configurado. Pide a un administrador usar `/set-canal-postulaciones`.',
                ephemeral: true
            });
        }

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('iniciar_postulacion').setLabel('Aceptar').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('cancelar_postulacion').setLabel('Rechazar').setStyle(ButtonStyle.Danger)
        );

        const embedMD = new EmbedBuilder()
            .setTitle(`📜 Postulación — ${guild.name}`)
            .setColor('#57F287')
            .setDescription(`Hola **${user.username}**, presiona **Aceptar** para iniciar tu postulación o **Rechazar** para cancelar.`)
            .setThumbnail(guild.iconURL({ dynamic: true }))
            .setFooter({ text: 'CPU v2' })
            .setTimestamp();

        try {
            const mensajeDM = await user.send({ components: [embedToContainer(embedMD), row], flags: MessageFlags.IsComponentsV2 });
            await interaction.reply({ content: '📬 Te hemos enviado un MD para comenzar tu postulación.', ephemeral: true });

            const collector = mensajeDM.createMessageComponentCollector({ time: 60000 });
            let respondido = false;

            collector.on('collect', async i => {
                respondido = true;
                if (i.customId === 'cancelar_postulacion') {
                    await i.update({ components: [new TextDisplayBuilder().setContent('❌ Has cancelado la postulación.')], flags: MessageFlags.IsComponentsV2 });
                    return;
                }

                if (i.customId === 'iniciar_postulacion') {
                    await i.update({ components: [new TextDisplayBuilder().setContent('📝 **Proceso Iniciado.** Responde a las siguientes preguntas directamente por este chat.')], flags: MessageFlags.IsComponentsV2 });

                    // ================================================
                    // 📋 PREGUNTAS DE POSTULACIÓN — EDITA AQUÍ
                    // ================================================
                    const preguntas = [
                        '1️⃣ ¿Qué edad tienes? (Requisitos: +15)',
                        '2️⃣ ¿Tienes experiencia previa como Moderador o Staff?',
                        '3️⃣ ¿Cuántas horas diarias podrías dedicar?',
                        '4️⃣ Prueba: ¿Que harias al ver una discusion?'
                    ];
                    // ================================================

                    const respuestas = [];
                    const dmChannel = await user.createDM();

                    for (const preg of preguntas) {
                        await dmChannel.send(`📌 **Pregunta:** ${preg}`);
                        try {
                            const resp = await dmChannel.awaitMessages({
                                filter: m => m.author.id === user.id,
                                max: 1,
                                time: 180000,
                                errors: ['time']
                            });
                            respuestas.push(resp.first().content);
                        } catch (e) {
                            return dmChannel.send('⏳ Se agotó el tiempo de respuesta. Postulación cancelada.');
                        }
                    }

                    const canalDestino = guild.channels.cache.get(canalId);
                    if (canalDestino) {
                        const embedExpediente = new EmbedBuilder()
                            .setTitle('📥 Nueva Postulación')
                            .setColor('#FEE75C')
                            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                            .addFields(
                                { name: 'Candidato', value: `${user.username}`, inline: false },
                                { name: preguntas[0], value: respuestas[0] },
                                { name: preguntas[1], value: respuestas[1] },
                                { name: preguntas[2], value: respuestas[2] },
                                { name: preguntas[3], value: respuestas[3] }
                            )
                            .setFooter({ text: 'CPU v2' })
                            .setTimestamp();

                        await canalDestino.send({ components: [embedToContainer(embedExpediente)], flags: MessageFlags.IsComponentsV2 });
                        await dmChannel.send('✅ **¡Postulación enviada con éxito!** Tus respuestas han sido entregadas.');
                    } else {
                        await dmChannel.send('⚠️ Hubo un error al entregar el expediente. Contacta a un administrador.');
                    }
                }
            });

            collector.on('end', async () => {
                if (!respondido) {
                    try {
                        await mensajeDM.edit({ components: [new TextDisplayBuilder().setContent('⏳ El tiempo para responder expiró. Usa `/postularse` de nuevo si deseas continuar.')], flags: MessageFlags.IsComponentsV2 });
                    } catch (e) { /* el mensaje pudo haber sido borrado */ }
                }
            });

        } catch (error) {
            return interaction.reply({ content: '❌ No pude enviarte un mensaje privado. Revisa tus ajustes de privacidad.', ephemeral: true });
        }
    }
};
