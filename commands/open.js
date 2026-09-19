const { SlashCommandBuilder } = require('discord.js');
const { crearTicket } = require('../utils/tickets');

module.exports = {
    requiereStaff: true,
    data: new SlashCommandBuilder()
        .setName('open')
        .setDescription('Abre un ticket de soporte a nombre de otro usuario (uso del Staff)')
        .addUserOption(opt => opt.setName('usuario').setDescription('Usuario al que se le abrirá el ticket').setRequired(true)),

    async execute(interaction) {
        const { options, guild, user } = interaction;
        const miembroObjetivo = options.getMember('usuario');
        if (!miembroObjetivo) {
            return interaction.reply({ content: '❌ Ese usuario no se encuentra en el servidor.', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        const resultado = await crearTicket(guild, miembroObjetivo, user);
        if (!resultado.ok) {
            return interaction.editReply({ content: resultado.motivo });
        }

        return interaction.editReply({ content: `✅ Ticket abierto para **${miembroObjetivo.user.username}**: <#${resultado.channel.id}>` });
    }
};
