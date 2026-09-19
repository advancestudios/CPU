const { crearTicket } = require('../utils/tickets');

module.exports = {
    customId: 'abrir_ticket',
    async execute(interaction) {
        const { guild, member } = interaction;
        await interaction.deferReply({ ephemeral: true });

        const resultado = await crearTicket(guild, member, member.user);
        if (!resultado.ok) {
            return interaction.editReply({ content: resultado.motivo });
        }

        return interaction.editReply({ content: `✅ Tu ticket fue creado: <#${resultado.channel.id}>` });
    }
};
