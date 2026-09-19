const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const { embedToContainer } = require('../utils/embeds');

module.exports = {
    requiereStaff: false,
    data: new SlashCommandBuilder()
        .setName('cmdcheck')
        .setDescription('Verifica los permisos que posee un miembro en el servidor')
        .addUserOption(opt => opt.setName('usuario').setDescription('Miembro a consultar (por defecto: tú mismo)').setRequired(false)),

    async execute(interaction) {
        const { options } = interaction;
        const miembro = options.getMember('usuario') || interaction.member;

        const mapaPermisos = {
            Administrator: 'Administrador',
            ManageGuild: 'Gestionar Servidor',
            ManageChannels: 'Gestionar Canales',
            ManageRoles: 'Gestionar Roles',
            ManageMessages: 'Gestionar Mensajes',
            ManageNicknames: 'Gestionar Apodos',
            ManageWebhooks: 'Gestionar Webhooks',
            ManageEmojisAndStickers: 'Gestionar Emojis y Stickers',
            KickMembers: 'Expulsar Miembros',
            BanMembers: 'Banear Miembros',
            ModerateMembers: 'Moderar Miembros (Timeout)',
            MentionEveryone: 'Mencionar a Todos',
            MuteMembers: 'Silenciar Miembros (Voz)',
            DeafenMembers: 'Ensordecer Miembros (Voz)',
            MoveMembers: 'Mover Miembros (Voz)',
            ViewAuditLog: 'Ver Registro de Auditoría',
            CreateInstantInvite: 'Crear Invitación'
        };

        const permisosActivos = Object.entries(mapaPermisos)
            .filter(([flag]) => miembro.permissions.has(PermissionFlagsBits[flag]))
            .map(([, nombre]) => `✅ ${nombre}`);

        const embed = new EmbedBuilder()
            .setTitle(`🔍 Permisos — ${miembro.user.username}`)
            .setColor('#5865F2')
            .setThumbnail(miembro.user.displayAvatarURL({ dynamic: true }))
            .setDescription(permisosActivos.length ? permisosActivos.join('\n') : 'Sin permisos administrativos relevantes.')
            .setFooter({ text: 'CPU v2' })
            .setTimestamp();

        return interaction.reply({ components: [embedToContainer(embed)], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
    }
};
