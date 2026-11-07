const { MessageFlags } = require('discord.js');
const { esMiembroStaff } = require('../utils/config');

// Responde un error al usuario sin importar si la interacción ya fue respondida
async function avisarError(interaction, texto) {
    const payload = { content: texto, flags: MessageFlags.Ephemeral };
    try {
        if (interaction.replied || interaction.deferred) await interaction.followUp(payload);
        else await interaction.reply(payload);
    } catch { /* la interacción expiró (más de 3 s sin responder) o ya no existe */ }
}

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        // Formularios (ej: /embed)
        if (interaction.isModalSubmit()) {
            const modal = client.modals.get(interaction.customId);
            if (!modal) return;
            try {
                await modal.execute(interaction);
            } catch (error) {
                console.error(`Error en el formulario ${interaction.customId}:`, error);
                await avisarError(interaction, '<:x_icon:1553581267600146483> Ocurrió un error al procesar el formulario.');
            }
            return;
        }

        // Botones (ej: tickets). Los botones con collector propio (/help, /postularse) no están aquí y se ignoran.
        if (interaction.isButton()) {
            if (!interaction.guild) return;
            const boton = client.buttons.get(interaction.customId);
            if (!boton) return;
            try {
                await boton.execute(interaction);
            } catch (error) {
                console.error(`Error en el botón ${interaction.customId}:`, error);
                await avisarError(interaction, '<:x_icon:1553581267600146483> Ocurrió un error al usar este botón.');
            }
            return;
        }

        // Comandos slash
        if (!interaction.isChatInputCommand()) return;

        const comando = client.commands.get(interaction.commandName);
        if (!comando) {
            return avisarError(interaction, '<:warn_icon:1552150324154998804> Ese comando ya no existe. Si lo sigues viendo en Discord, hay que volver a registrarlos con `node deploy-commands.js`.');
        }

        if (!interaction.guild) {
            return avisarError(interaction, '<:warn_icon:1552150324154998804> Este comando solo funciona dentro de un servidor.');
        }

        if (comando.requiereStaff && !esMiembroStaff(interaction.member, interaction.guild.id)) {
            return avisarError(interaction, '<:x_icon:1553581267600146483> Acceso denegado: Necesitas permisos de Administrador para usar este comando.');
        }

        try {
            await comando.execute(interaction);
        } catch (error) {
            console.error(`Error al ejecutar /${interaction.commandName}:`, error);
            await avisarError(interaction, '<:x_icon:1553581267600146483> Ocurrió un error inesperado al ejecutar este comando.');
        }
    }
};
