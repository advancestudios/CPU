const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { embedToContainer } = require('../utils/embeds');
const { esMiembroStaff } = require('../utils/config');

module.exports = {
    requiereStaff: false, // tiene su propia lógica de permisos (uno mismo siempre puede)
    data: new SlashCommandBuilder()
        .setName('nick')
        .setDescription('Modifica tu apodo o el de otro miembro')
        .addStringOption(opt => opt.setName('apodo').setDescription('Nuevo apodo (vacío para restablecer)').setRequired(false))
        .addUserOption(opt => opt.setName('usuario').setDescription('Miembro a modificar (Solo Administradores)').setRequired(false)),

    async execute(interaction) {
        const { options, guild, user } = interaction;
        const nuevoApodo = options.getString('apodo') || null;
        const miembroObjetivo = options.getMember('usuario') || interaction.member;

        if (miembroObjetivo.id !== user.id) {
            if (!esMiembroStaff(interaction.member, guild.id)) {
                return interaction.reply({ content: '❌ Requieres ser Staff o tener permisos para modificar el alias de otro usuario.', ephemeral: true });
            }
            if (guild.ownerId === miembroObjetivo.id) {
                return interaction.reply({ content: '❌ Prohibido modificar credenciales del propietario del servidor.', ephemeral: true });
            }
            if (miembroObjetivo.roles.highest.position >= guild.members.me.roles.highest.position) {
                return interaction.reply({ content: '❌ Jerarquía insuficiente para alterar a este miembro.', ephemeral: true });
            }
        } else {
            if (guild.ownerId === user.id) {
                return interaction.reply({ content: '❌ Discord no permite alterar el apodo del dueño del servidor vía bot.', ephemeral: true });
            }
        }

        try {
            await miembroObjetivo.setNickname(nuevoApodo);

            const embed = new EmbedBuilder()
                .setTitle('✏️ Apodo Actualizado')
                .setColor('#57F287')
                .addFields(
                    { name: 'Miembro', value: `${miembroObjetivo.user.username}`, inline: true },
                    { name: 'Nuevo Apodo', value: nuevoApodo || 'Restablecido', inline: true },
                    { name: 'Moderador', value: `${user.username}`, inline: true }
                )
                .setFooter({ text: 'CPU v2' })
                .setTimestamp();

            return interaction.reply({ components: [embedToContainer(embed)], flags: MessageFlags.IsComponentsV2 });
        } catch (error) {
            return interaction.reply({ content: '❌ Error al modificar el apodo.', ephemeral: true });
        }
    }
};
