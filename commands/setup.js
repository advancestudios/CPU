const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder, MessageFlags } = require('discord.js');
const { setGuildConfig } = require('../utils/config');
const { embedToContainer } = require('../utils/embeds');

module.exports = {
    requiereStaff: false,
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Configuración general del servidor')
        .addSubcommand(sub =>
            sub.setName('mod-actions')
               .setDescription('Establece el canal donde se enviará el registro de cada sanción')
               .addChannelOption(opt => opt.setName('canal').setDescription('Canal de registros de moderación').addChannelTypes(ChannelType.GuildText).setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('tickets')
               .setDescription('Establece la categoría donde se crearán los tickets de soporte')
               .addChannelOption(opt => opt.setName('categoria').setDescription('Categoría de tickets').addChannelTypes(ChannelType.GuildCategory).setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('apelaciones')
               .setDescription('Establece el enlace del servidor de apelaciones (se usa solo en /ban)')
               .addStringOption(opt => opt.setName('enlace').setDescription('Enlace de invitación de Discord').setRequired(true))
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const { options, guild } = interaction;
        const sub = options.getSubcommand();

        if (sub === 'mod-actions') {
            const canal = options.getChannel('canal');
            setGuildConfig(guild.id, { modActions: canal.id });

            const embed = new EmbedBuilder()
                .setTitle('⚙️ Registro de Moderación Configurado')
                .setColor('#57F287')
                .addFields({ name: 'Canal de Registros', value: `<#${canal.id}>` })
                .setFooter({ text: 'CPU v2' })
                .setTimestamp();

            return interaction.reply({ components: [embedToContainer(embed)], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }

        if (sub === 'tickets') {
            const categoria = options.getChannel('categoria');
            setGuildConfig(guild.id, { ticketsCategory: categoria.id });

            const embed = new EmbedBuilder()
                .setTitle('⚙️ Categoría de Tickets Configurada')
                .setColor('#57F287')
                .addFields({ name: 'Categoría', value: `${categoria.name}` })
                .setFooter({ text: 'CPU v2' })
                .setTimestamp();

            return interaction.reply({ components: [embedToContainer(embed)], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }

        if (sub === 'apelaciones') {
            const enlace = options.getString('enlace');
            if (!/^https?:\/\/.+/.test(enlace)) {
                return interaction.reply({ content: '⚠️ Ese no parece un enlace válido (debe empezar con http:// o https://).', ephemeral: true });
            }
            setGuildConfig(guild.id, { apelacionLink: enlace });

            const embed = new EmbedBuilder()
                .setTitle('⚙️ Enlace de Apelaciones Configurado')
                .setColor('#57F287')
                .addFields({ name: 'Servidor de Apelaciones', value: enlace })
                .setFooter({ text: 'CPU v2' })
                .setTimestamp();

            return interaction.reply({ components: [embedToContainer(embed)], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }
    }
};
