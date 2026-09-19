const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const { setGuildConfig } = require('../utils/config');
const { embedToContainer } = require('../utils/embeds');

module.exports = {
    requiereStaff: false,
    data: new SlashCommandBuilder()
        .setName('setup-rol-soporte')
        .setDescription('Establece el rol de Staff que se mencionará al abrirse un ticket')
        .addRoleOption(opt => opt.setName('rol').setDescription('Rol de soporte').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const { options, guild } = interaction;
        const rol = options.getRole('rol');
        setGuildConfig(guild.id, { ticketsRole: rol.id });

        const embed = new EmbedBuilder()
            .setTitle('⚙️ Rol de Soporte Configurado')
            .setColor('#57F287')
            .addFields({ name: 'Rol Mencionado en Tickets', value: `<@&${rol.id}>` })
            .setFooter({ text: 'CPU v2' })
            .setTimestamp();

        return interaction.reply({ components: [embedToContainer(embed)], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
    }
};
