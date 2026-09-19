const { esMiembroStaff } = require('../utils/config');

module.exports = {
    customId: 'cerrar_ticket',
    async execute(interaction) {
        const { guild, member, channel } = interaction;
        const topic = channel.topic || '';
        const ownerId = topic.startsWith('ticket-owner:') ? topic.split(':')[1] : null;
        const esDueño = ownerId === member.id;
        const esStaff = esMiembroStaff(member, guild.id);

        if (!esDueño && !esStaff) {
            return interaction.reply({ content: '❌ No tienes permiso para cerrar este ticket.', ephemeral: true });
        }

        await interaction.reply({ content: `🔒 Ticket cerrado por **${member.user.username}**. Este canal se eliminará en 5 segundos.` });
        setTimeout(() => {
            channel.delete().catch(() => {});
        }, 5000);
    }
};
