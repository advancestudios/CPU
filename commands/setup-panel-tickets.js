const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { getGuildConfig } = require('../utils/config');
const { embedToContainer } = require('../utils/embeds');

module.exports = {
    requiereStaff: false,
    data: new SlashCommandBuilder()
        .setName('setup-panel-tickets')
        .setDescription('Envía el panel de soporte con el botón para abrir tickets en este canal')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const { guild, channel } = interaction;
        const cfg = getGuildConfig(guild.id);
        if (!cfg.ticketsCategory) {
            return interaction.reply({ content: '⚠️ Primero configura la categoría con `/setup tickets`.', ephemeral: true });
        }

        const embedPanel = new EmbedBuilder()
            .setTitle('🎫 Soporte al Miembro')
            .setColor('#5865F2')
            .setDescription('¿Necesitas ayuda o tienes una duda? Presiona el botón para abrir un ticket privado con el Staff.')
            .setFooter({ text: 'CPU v2' })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('abrir_ticket').setLabel('Abrir Ticket').setEmoji('🎫').setStyle(ButtonStyle.Primary)
        );

        await channel.send({ components: [embedToContainer(embedPanel), row], flags: MessageFlags.IsComponentsV2 });
        return interaction.reply({ content: '✅ Panel de tickets enviado.', ephemeral: true });
    }
};
