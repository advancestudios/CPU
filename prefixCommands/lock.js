const { esMiembroStaff } = require('../utils/config');

module.exports = {
    name: 'lock',
    async execute(message) {
        if (!esMiembroStaff(message.member, message.guild.id)) {
            return message.reply({ content: '❌ No se pudo bloquear el canal.' });
        }
        try {
            await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false });
            return message.channel.send({ content: '✅ Canal bloqueado.' });
        } catch (e) {
            return message.reply({ content: '❌ No se pudo bloquear el canal.' });
        }
    }
};
