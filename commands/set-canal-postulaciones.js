const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder, MessageFlags } = require('discord.js');
const { setGuildConfig } = require('../utils/config');
const { embedToContainer } = require('../utils/embeds');

module.exports = {
    requiereStaff: false,
    data: new SlashCommandBuilder()
        .setName('set-canal-postulaciones')
        .setDescription('Configura el canal para recibir postulaciones')
        .addChannelOption(opt => opt.setName('canal').setDescription('Canal de recepción').addChannelTypes(ChannelType.GuildText).setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const { options, guild } = interaction;
        const canalTexto = options.getChannel('canal');
        setGuildConfig(guild.id, { postulaciones: canalTexto.id });

        const embed = new EmbedBuilder()
            .setTitle('⚙️ Canal Configurado')
            .setColor('#57F287')
            .addFields({ name: 'Canal de Postulaciones', value: `<#${canalTexto.id}>` })
            .setFooter({ text: 'CPU v2' })
            .setTimestamp();

        return interaction.reply({ components: [embedToContainer(embed)], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
    }
};
