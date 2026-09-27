const { esMiembroStaff } = require('../utils/config');

module.exports = {
    name: 'lock',
    async execute(message) {
        if (!esMiembroStaff(message.member, message.guild.id)) {
            return message.reply({ content: '<:x_icon:1553581267600146483> No se pudo bloquear el canal.' });
        }
        try {
            await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false });
            return message.channel.send({ content: '<:check_icon:1553581296398114846> Canal bloqueado.' });
        } catch (e) {
            return message.reply({ content: '<:x_icon:1553581267600146483> No se pudo bloquear el canal.' });
        }
    }
};
