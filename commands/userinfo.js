const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { embedToContainer } = require('../utils/embeds');

module.exports = {
    requiereStaff: false,
    data: new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('Muestra información detallada de un miembro')
        .addUserOption(opt => opt.setName('usuario').setDescription('Miembro a consultar (por defecto: tú mismo)').setRequired(false)),

    async execute(interaction) {
        const { options, guild } = interaction;
        const miembro = options.getMember('usuario') || interaction.member;
        const rolesOrdenados = miembro.roles.cache
            .filter(r => r.id !== guild.id)
            .sort((a, b) => b.position - a.position)
            .map(r => `<@&${r.id}>`);

        const embed = new EmbedBuilder()
            .setTitle(`👤 ${miembro.user.username}`)
            .setColor('#5865F2')
            .setThumbnail(miembro.user.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: 'ID', value: `${miembro.id}`, inline: false },
                { name: 'Cuenta Creada', value: `<t:${Math.floor(miembro.user.createdTimestamp / 1000)}:D>`, inline: true },
                { name: 'Se Unió', value: miembro.joinedTimestamp ? `<t:${Math.floor(miembro.joinedTimestamp / 1000)}:D>` : 'Desconocido', inline: true },
                { name: `Roles (${rolesOrdenados.length})`, value: rolesOrdenados.length ? rolesOrdenados.join(', ') : 'Ninguno', inline: false }
            )
            .setFooter({ text: 'CPU v2' })
            .setTimestamp();

        return interaction.reply({ components: [embedToContainer(embed)], flags: MessageFlags.IsComponentsV2 });
    }
};
