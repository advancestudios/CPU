const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const { setGuildConfig } = require('../utils/config');
const { embedToContainer } = require('../utils/embeds');

module.exports = {
    requiereStaff: false, // el propio Administrator gate ya lo cubre setDefaultMemberPermissions
    data: new SlashCommandBuilder()
        .setName('staff')
        .setDescription('Comandos de administración del Staff')
        .addSubcommand(sub =>
            sub.setName('perms')
               .setDescription('Establece el rol oficial de Staff para permitir el uso de comandos administrativos')
               .addRoleOption(opt => opt.setName('rol').setDescription('Rol asignado al Staff del servidor').setRequired(true))
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const { options, guild } = interaction;
        const sub = options.getSubcommand();
        if (sub === 'perms') {
            const rolStaff = options.getRole('rol');
            setGuildConfig(guild.id, { staffRole: rolStaff.id });

            const embed = new EmbedBuilder()
                .setTitle('⚙️ Permisos de Staff Configurados')
                .setColor('#57F287')
                .addFields({ name: 'Rol Autorizado para Staff', value: `<@&${rolStaff.id}>` })
                .setFooter({ text: 'CPU v2' })
                .setTimestamp();

            return interaction.reply({ components: [embedToContainer(embed)], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }
    }
};
