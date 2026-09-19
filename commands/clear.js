const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    requiereStaff: true,
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Limpia mensajes masivamente')
        .addIntegerOption(opt => opt.setName('cantidad').setDescription('Cantidad (1-10000)').setRequired(true).setMinValue(1).setMaxValue(10000)),

    async execute(interaction) {
        const { options, channel } = interaction;
        const cantidad = options.getInteger('cantidad');
        try {
            const borrados = await channel.bulkDelete(cantidad, true);
            return interaction.reply({
                content: `🧹 **Mantenimiento Completado:** Se han purgado **${borrados.size} mensajes** del canal de forma segura.`,
                ephemeral: true
            });
        } catch (error) {
            return interaction.reply({ content: '❌ Imposible eliminar mensajes con una antigüedad mayor a 14 días.', ephemeral: true });
        }
    }
};
