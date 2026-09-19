const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { embedToContainer } = require('../utils/embeds');

module.exports = {
    name: 'help',
    async execute(message) {
        const listaComandos = {
            'Configuración Staff': [
                '`/staff perms` — Configura el rol de Staff del servidor'
            ],
            'Moderación (Slash y Prefijo)': [
                '`/kick` — Expulsa a un miembro',
                '`/ban` — Banea a un miembro',
                '`;softban` o `/softban` — Softban (expulsa y purga historial)',
                '`/unban` — Revoca un baneo',
                '`/mute` — Silencia temporalmente',
                '`/unmute` — Remueve el silencio',
                '`/warn` — Registra una advertencia',
                '`/warns view` — Consulta el historial de advertencias',
                '`/warns clear` — Limpia el historial de advertencias',
                '`/role add` — Asigna un rol',
                '`/role remove` — Remueve un rol',
                '`/clear` — Elimina mensajes masivamente'
            ],
            'Utilidad (Slash)': [
                '`/nick` — Cambia tu apodo o el de otro miembro',
                '`/userinfo` — Información de un miembro',
                '`/cmdcheck` — Verifica los permisos de un miembro',
                '`/postularse` — Inicia tu proceso de postulación',
                '`/set-canal-postulaciones` — Configura el canal de postulaciones',
                '`/send` — Envía un mensaje en el canal',
                '`/embed` — Envía un Embed formateado usando un cuadro de texto'
            ],
            'Generales (Prefijo ;)': [
                '`;ping` — Verifica la latencia del bot',
                '`;help` — Muestra este panel de comandos',
                '`;botinvite` — Obtén el enlace para invitar al bot',
                '`;serverinvite` — Recibe la invitación de este servidor por MD',
                '`;lock` — Bloquea el canal actual',
                '`;unlock` — Desbloquea el canal actual',
                '`;setstatus` — Cambia el estado del bot (Solo creador)'
            ]
        };

        const categorias = Object.keys(listaComandos);
        let pagina = 0;

        const construirEmbed = (i) => new EmbedBuilder()
            .setTitle('🖥️ Panel de Comandos')
            .setColor('#5865F2')
            .setThumbnail(message.client.user.displayAvatarURL())
            .addFields({ name: `📂 ${categorias[i]}`, value: listaComandos[categorias[i]].join('\n') })
            .setFooter({ text: `Página ${i + 1} de ${categorias.length} • CPU v2` })
            .setTimestamp();

        const construirBotones = (i) => new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('help_prev').setLabel('⬅️ Anterior').setStyle(ButtonStyle.Secondary).setDisabled(i === 0),
            new ButtonBuilder().setCustomId('help_next').setLabel('Siguiente ➡️').setStyle(ButtonStyle.Secondary).setDisabled(i === categorias.length - 1)
        );

        const helpMsg = await message.reply({ components: [embedToContainer(construirEmbed(pagina)), construirBotones(pagina)], flags: MessageFlags.IsComponentsV2 });
        const collector = helpMsg.createMessageComponentCollector({ time: 120000 });

        collector.on('collect', async i => {
            if (i.user.id !== message.author.id) {
                return i.reply({ content: '❌ Solo quien ejecutó el comando puede navegar este menú.', ephemeral: true });
            }
            if (i.customId === 'help_next') pagina++;
            if (i.customId === 'help_prev') pagina--;
            await i.update({ components: [embedToContainer(construirEmbed(pagina)), construirBotones(pagina)], flags: MessageFlags.IsComponentsV2 });
        });

        collector.on('end', async () => {
            try { await helpMsg.edit({ components: [embedToContainer(construirEmbed(pagina))], flags: MessageFlags.IsComponentsV2 }); } catch (e) { /* el mensaje pudo haber sido borrado */ }
        });
    }
};
