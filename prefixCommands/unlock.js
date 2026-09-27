const { esMiembroStaff } = require('../utils/config');

module.exports = {
    name: 'unlock',
    async execute(message) {
        if (!esMiembroStaff(message.member, message.guild.id)) {
            return message.reply({ content: '<:x_icon:1553581267600146483> No se pudo desbloquear el canal.' });
        }
        try {
            await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: null });
            return message.channel.send({ content: '<:check_icon:1553581296398114846> Canal desbloqueado.' });
        } catch (e) {
            return message.reply({ content: '<:x_icon:1553581267600146483> No se pudo desbloquear el canal.' });
        }
    }
};
