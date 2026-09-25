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
        try {
            await guild.members.unban(userId);

            const embed = new EmbedBuilder()
                .setTitle('✅ Baneo Revocado')
                .addFields(
                    { name: 'ID Revocado', value: `${userId}`, inline: true },
                    { name: 'Moderador', value: `${user.username}`, inline: true }
                )
                .setFooter({ text: 'CPU v2' })
                .setTimestamp();

            await logModeracion(guild, embed);
            return interaction.reply({ components: [embedToContainer(embed)], flags: MessageFlags.IsComponentsV2 });
        } catch (error) {
            return interaction.reply({ content: '❌ Error: La ID provista no coincide con ningún baneo activo.', ephemeral: true });
        }
    }
};
