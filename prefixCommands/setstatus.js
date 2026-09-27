const { ActivityType } = require('discord.js');
const { CREADORES_IDS } = require('../utils/constants');

module.exports = {
    name: 'setstatus',
    async execute(message, args) {
        if (!CREADORES_IDS.includes(message.author.id)) {
            return message.reply({ content: '<:x_icon:1553581267600146483> Este comando es de uso exclusivo para mi creador.' });
        }

        const estado = args[0]?.toLowerCase();
        const tipoActividad = args[1]?.toLowerCase();
        const texto = args.slice(2).join(' ');

        if (!estado || !['online', 'idle', 'dnd', 'invisible'].includes(estado)) {
            return message.reply({
                content: '<:warn_icon:1552150324154998804> **Uso correcto:** `;setstatus <estado> <tipo> <texto>`\n**Estados:** `online`, `idle`, `dnd`, `invisible`\n**Tipos:** `watching`, `playing`, `listening`, `competing`, `streaming`\n**Ejemplo:** `;setstatus online streaming Mi Stream de Twitch`'
            });
        }

        const tiposMap = {
            'watching': ActivityType.Watching,
            'playing': ActivityType.Playing,
            'listening': ActivityType.Listening,
            'competing': ActivityType.Competing,
            'streaming': ActivityType.Streaming
        };

        try {
            const actividadObj = {
                name: texto || 'CPU v2 Bot',
                type: tiposMap[tipoActividad] || ActivityType.Playing
            };

            if (tipoActividad === 'streaming') {
                actividadObj.url = 'https://www.twitch.tv/discord';
            }

            message.client.user.setPresence({
                status: estado,
                activities: texto ? [actividadObj] : []
            });

            return message.reply({ content: `<:check_icon:1553581296398114846> Presencia actualizada a estado **${estado.toUpperCase()}**${texto ? ` y actividad "${texto}"` : ''}.` });
        } catch (error) {
            console.error('Error al cambiar estado:', error);
            return message.reply({ content: '<:x_icon:1553581267600146483> Ocurrió un error al intentar cambiar la presencia.' });
        }
    }
};
