const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    requiereStaff: true,
    data: new SlashCommandBuilder()
        .setName('send')
        .setDescription('Envía un mensaje normal en el canal (uso del Staff)')
        .addStringOption(opt => opt.setName('mensaje').setDescription('Contenido del mensaje a enviar').setRequired(true)),

    async execute(interaction) {
        const { options, channel } = interaction;
        const contenidoMensaje = options.getString('mensaje');

        try {
            await channel.send({ content: contenidoMensaje });
            return interaction.reply({ content: '<:check_icon:1553581296398114846> Mensaje enviado con éxito.', ephemeral: true });
        } catch (error) {
            console.error('Error en /send:', error);
            return interaction.reply({ content: '<:x_icon:1553581267600146483> No pude enviar el mensaje en este canal.', ephemeral: true });
        }
    }
};
