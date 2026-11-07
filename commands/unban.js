const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { embedToContainer, logModeracion } = require('../utils/embeds');

module.exports = {
    requiereStaff: true,
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Revoca el baneo de un usuario mediante su ID')
        .addStringOption(opt => opt.setName('id').setDescription('ID de Discord del usuario').setRequired(true)),

    async execute(interaction) {
        const { options, guild, user } = interaction;
        const userId = options.getString('id');
        if (!/^\d{5,25}$/.test(userId)) {
            return interaction.reply({ content: '<:x_icon:1553581267600146483> Esa no parece una ID de Discord (solo números).', ephemeral: true });
        }

        try {
            await guild.members.unban(userId);
        } catch (error) {
            return interaction.reply({ content: '<:x_icon:1553581267600146483> Error: La ID provista no coincide con ningún baneo activo.', ephemeral: true });
        }

        try {
            const objetivo = await interaction.client.users.fetch(userId).catch(() => null);
            const embed = new EmbedBuilder()
                .setTitle('<:check_icon:1553581296398114846> Baneo Revocado')
                .addFields(
                    { name: 'Usuario', value: objetivo ? `${objetivo} (${objetivo.username})` : `${userId}`, inline: true },
                    { name: 'Moderador', value: `${user}`, inline: true }
                )
                .setFooter({ text: 'CPU v2' })
                .setTimestamp();

            await logModeracion(guild, embed);
            return interaction.reply({ components: [embedToContainer(embed)], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } });
        } catch (error) {
            console.error('Error en /unban (después de revocar):', error);
            return interaction.reply({ content: '<:check_icon:1553581296398114846> Baneo revocado.', ephemeral: true }).catch(() => {});
        }
    }
};
