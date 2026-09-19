const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

module.exports = {
    requiereStaff: true,
    data: new SlashCommandBuilder()
        .setName('embed')
        .setDescription('Crea y envía un Embed personalizado mediante un formulario (uso del Staff)'),

    // El procesamiento real ocurre en modals/modal_comando_embed.js cuando el usuario envía el formulario
    async execute(interaction) {
        const modal = new ModalBuilder()
            .setCustomId('modal_comando_embed')
            .setTitle('Crear Embed Personalizado');

        const inputTitulo = new TextInputBuilder()
            .setCustomId('input_embed_titulo')
            .setLabel('Título del Embed')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Ej: Anuncio Oficial')
            .setRequired(false);

        const inputContenido = new TextInputBuilder()
            .setCustomId('input_embed_contenido')
            .setLabel('Contenido / Descripción (Usa {sp} para línea)')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Escribe el texto aquí. Usa {sp} donde quieras colocar una línea separadora.')
            .setRequired(true)
            .setMaxLength(4000);

        const inputFooter = new TextInputBuilder()
            .setCustomId('input_embed_footer')
            .setLabel('Pie de página (Footer)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Ej: Servidor de Discord • 2026')
            .setRequired(false);

        modal.addComponents(
            new ActionRowBuilder().addComponents(inputTitulo),
            new ActionRowBuilder().addComponents(inputContenido),
            new ActionRowBuilder().addComponents(inputFooter)
        );

        return await interaction.showModal(modal);
    }
};
