const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { embedToContainer } = require('../utils/embeds');

module.exports = {
    requiereStaff: true,
    data: new SlashCommandBuilder()
        .setName('role')
        .setDescription('Gestión jerárquica de roles')
        .addSubcommand(sub =>
            sub.setName('add')
               .setDescription('Asigna un rol a un miembro')
               .addUserOption(opt => opt.setName('usuario').setDescription('Miembro receptor').setRequired(true))
               .addRoleOption(opt => opt.setName('rol').setDescription('Rol a asignar').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('remove')
               .setDescription('Remueve un rol de un miembro')
               .addUserOption(opt => opt.setName('usuario').setDescription('Miembro afectado').setRequired(true))
               .addRoleOption(opt => opt.setName('rol').setDescription('Rol a remover').setRequired(true))
        ),

    async execute(interaction) {
        const { options, guild, user } = interaction;
        const usuario = options.getMember('usuario');

        if (!usuario) return interaction.reply({ content: '❌ El objetivo especificado no se encuentra en el servidor.', ephemeral: true });
        const sub = options.getSubcommand();
        const rol = options.getRole('rol');

        if (rol.position >= guild.members.me.roles.highest.position) {
            return interaction.reply({ content: '❌ Conflicto de Jerarquía: El rol solicitado se encuentra en un nivel superior al de este bot.', ephemeral: true });
        }

        if (sub === 'add') {
            if (usuario.roles.cache.has(rol.id)) return interaction.reply({ content: `ℹ️ El miembro ya posee el rol **${rol.name}**.`, ephemeral: true });
            await usuario.roles.add(rol);

            const embed = new EmbedBuilder()
                .setTitle('➕ Rol Asignado')
                .setColor('#57F287')
                .addFields(
                    { name: 'Miembro', value: `${usuario.user.username}`, inline: true },
                    { name: 'Rol', value: `<@&${rol.id}>`, inline: true },
                    { name: 'Moderador', value: `${user.username}`, inline: true }
                )
                .setFooter({ text: 'CPU v2' })
                .setTimestamp();

            return interaction.reply({ components: [embedToContainer(embed)], flags: MessageFlags.IsComponentsV2 });
        }

        if (sub === 'remove') {
            if (!usuario.roles.cache.has(rol.id)) return interaction.reply({ content: `ℹ️ El miembro no cuenta con el rol **${rol.name}**.`, ephemeral: true });
            await usuario.roles.remove(rol);

            const embed = new EmbedBuilder()
                .setTitle('➖ Rol Removido')
                .setColor('#ED4245')
                .addFields(
                    { name: 'Miembro', value: `${usuario.user.username}`, inline: true },
                    { name: 'Rol', value: `<@&${rol.id}>`, inline: true },
                    { name: 'Moderador', value: `${user.username}`, inline: true }
                )
                .setFooter({ text: 'CPU v2' })
                .setTimestamp();

            return interaction.reply({ components: [embedToContainer(embed)], flags: MessageFlags.IsComponentsV2 });
        }
    }
};
