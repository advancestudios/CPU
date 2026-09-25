const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { embedToContainer, logModeracion } = require('../utils/embeds');

module.exports = {
    requiereStaff: true,
    data: new SlashCommandBuilder()
        .setName('unmute')
        .setDescription('Remueve el aislamiento/silencio de un miembro')
        .addUserOption(opt => opt.setName('usuario').setDescription('El miembro a restablecer').setRequired(true)),

    async execute(interaction) {
        const { options, guild, user } = interaction;
        const usuario = options.getMember('usuario');

        if (!usuario) return interaction.reply({ content: '❌ El objetivo especificado no se encuentra en el servidor.', ephemeral: true });
        if (!usuario.moderatable) return interaction.reply({ content: '❌ No poseo la autoridad para modificar el estado de este miembro.', ephemeral: true });
        if (!usuario.communicationDisabledUntilTimestamp) return interaction.reply({ content: 'ℹ️ El miembro seleccionado no se encuentra bajo régimen de aislamiento.', ephemeral: true });

        await usuario.timeout(null);

        const embed = new EmbedBuilder()
            .setTitle('🔊 Silencio Removido')
            .addFields(
                { name: 'Miembro', value: `${usuario.user.username}`, inline: true },
                { name: 'Moderador', value: `${user.username}`, inline: true }
            )
            .setFooter({ text: 'CPU v2' })
            .setTimestamp();

        await logModeracion(guild, embed);
        return interaction.reply({ components: [embedToContainer(embed)], flags: MessageFlags.IsComponentsV2 });
    }
};
