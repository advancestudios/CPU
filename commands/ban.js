const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { getGuildConfig } = require('../utils/config');
const { embedToContainer, logModeracion } = require('../utils/embeds');

module.exports = {
    requiereStaff: true,
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Banea a un miembro del Servidor')
        .addUserOption(opt => opt.setName('usuario').setDescription('El miembro a banear').setRequired(true))
        .addStringOption(opt => opt.setName('razon').setDescription('Motivo detallado')),

    async execute(interaction) {
        const { options, guild, user } = interaction;
        const usuario = options.getMember('usuario');
        const razon = options.getString('razon') || 'Ninguna especificada.';

        if (!usuario) return interaction.reply({ content: '❌ El objetivo especificado no se encuentra en el servidor.', ephemeral: true });
        if (!usuario.bannable) return interaction.reply({ content: '❌ Operación denegada: El miembro posee inmunidad o un rol superior.', ephemeral: true });

        const cfgBan = getGuildConfig(guild.id);
        const filaApelacion = cfgBan.apelacionLink ? [new ActionRowBuilder().addComponents(
            new ButtonBuilder().setLabel('Apelar Sanción').setEmoji('📨').setStyle(ButtonStyle.Link).setURL(cfgBan.apelacionLink)
        )] : [];

        const embed = new EmbedBuilder()
            .setTitle('<:ban_icon:1552047267920478278> Miembro Baneado')
            .setThumbnail(usuario.user.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: 'Miembro', value: `${usuario.user.username}`, inline: true },
                { name: 'Moderador', value: `${user.username}`, inline: true },
                { name: 'Razón', value: razon, inline: false }
            )
            .setFooter({ text: 'CPU v2' })
            .setTimestamp();

        try { await usuario.send({ components: [embedToContainer(embed), ...filaApelacion], flags: MessageFlags.IsComponentsV2 }); } catch (e) { /* el usuario tiene los MDs cerrados, se ignora */ }

        try {
            await guild.members.ban(usuario.id, { reason: razon });
            await logModeracion(guild, embed, filaApelacion);
            return interaction.reply({ components: [embedToContainer(embed)], flags: MessageFlags.IsComponentsV2 });
        } catch (error) {
            console.error('Error en /ban:', error);
            return interaction.reply({ content: '❌ Ocurrió un error al intentar banear al miembro.', ephemeral: true });
        }
    }
};
