const { esMiembroStaff } = require('../utils/config');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        // Modales (ej: /embed)
        if (interaction.isModalSubmit()) {
            const modal = client.modals.get(interaction.customId);
            if (modal) {
                try {
                    await modal.execute(interaction);
                } catch (error) {
                    console.error(`Error en el modal ${interaction.customId}:`, error);
                }
            }
            return;
        }

        // Botones (ej: tickets)
        if (interaction.isButton()) {
            if (!interaction.guild) return;
            const boton = client.buttons.get(interaction.customId);
            if (boton) {
                try {
                    await boton.execute(interaction);
                } catch (error) {
                    console.error(`Error en el botón ${interaction.customId}:`, error);
                }
            }
            return;
        }

        // Comandos slash
        if (!interaction.isChatInputCommand()) return;

        const comando = client.commands.get(interaction.commandName);
        if (!comando) return;

        if (comando.requiereStaff) {
            if (!esMiembroStaff(interaction.member, interaction.guild.id)) {
                return interaction.reply({ content: '❌ Acceso denegado: Necesitas el rol de Staff o permisos de Administrador para usar este comando.', ephemeral: true });
            }
        }

        try {
            await comando.execute(interaction);
        } catch (error) {
            console.error(`Error al ejecutar /${interaction.commandName}:`, error);
            const payload = { content: '❌ Ocurrió un error inesperado al ejecutar este comando.', ephemeral: true };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(payload).catch(() => {});
            } else {
                await interaction.reply(payload).catch(() => {});
            }
        }
    }
};
