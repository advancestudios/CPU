const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');

module.exports = {
    customId: 'modal_comando_embed',
    async execute(interaction) {
        const titulo = interaction.fields.getTextInputValue('input_embed_titulo');
        const contenido = interaction.fields.getTextInputValue('input_embed_contenido');
        const footer = interaction.fields.getTextInputValue('input_embed_footer');

        try {
            const container = new ContainerBuilder()

            // 1. Título principal (sin separador propio: no mete espacio de más)
            if (titulo && titulo.trim().length > 0) {
                container.addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`# ${titulo.trim()}`)
                );
            }

            // 2. Contenido: cada bloque separado por {sp} es UN SOLO TextDisplay
            // (así no queda espacio entre líneas dentro del mismo bloque).
            // {sp} es el único que genera una línea divisoria visible entre bloques.
            if (contenido && contenido.trim().length > 0) {
                const bloques = contenido.split('{sp}');

                bloques.forEach((bloque, index) => {
                    const textoLimpio = bloque.trim();
                    if (textoLimpio.length > 0) {
                        container.addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(textoLimpio)
                        );
                    }

                    // Línea divisoria SOLO entre bloques separados por {sp}
                    if (index < bloques.length - 1) {
                        container.addSeparatorComponents(
                            new SeparatorBuilder()
                                .setSpacing(SeparatorSpacingSize.Small)
                                .setDivider(true)
                        );
                    }
                });
            }

            // 3. Pie de página (Footer)
            if (footer && footer.trim().length > 0) {
                container.addSeparatorComponents(
                    new SeparatorBuilder()
                        .setSpacing(SeparatorSpacingSize.Small)
                        .setDivider(true)
                );
                container.addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`-# ${footer.trim()}`)
                );
            }

            await interaction.channel.send({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });

            return await interaction.reply({ content: '✅ Embed enviado con éxito.', ephemeral: true });
        } catch (error) {
            console.error('Error al construir/enviar el embed personalizado:', error);
            return interaction.reply({ content: '❌ Ocurrió un error al enviar el Embed.', ephemeral: true }).catch(() => {});
        }
    }
};
