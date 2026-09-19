require('dotenv').config();
const { 
    Client, 
    GatewayIntentBits, 
    REST, 
    Routes, 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    PermissionsBitField,
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ChannelType,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    SectionBuilder,
    ThumbnailBuilder,
    MessageFlags,
    ActivityType,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const express = require('express');

// ========================================================
// SISTEMA DE CONFIGURACIÓN UNIVERSAL (CACHE + MONGO DB)
// ========================================================
const mongoose = require('mongoose');

const ServerSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    settings: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} } 
});

const WarnSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true }, // guildId-userId
    warns: [
        {
            moderador: String,
            razon: String,
            fecha: String
        }
    ]
});

const ServerModel = mongoose.model('Server', ServerSchema);
const WarnModel = mongoose.model('Warn', WarnSchema);

global.botCache = new Map();

mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        console.log('🟢 [MongoDB] Conectado exitosamente a Atlas.');
        
        const todosLosServidores = await ServerModel.find({});
        todosLosServidores.forEach(srv => {
            global.botCache.set(srv.guildId, srv.settings);
        });
        console.log(`📦 [Cache] Se han cargado las configuraciones de ${todosLosServidores.length} servidores.`);
    })
    .catch(err => console.error('🔴 [MongoDB] Error crítico al conectar:', err));

global.getSetting = (guildId, key, defaultValue = null) => {
    const srvSettings = global.botCache.get(guildId);
    if (!srvSettings) return defaultValue;
    const value = srvSettings instanceof Map ? srvSettings.get(key) : srvSettings[key];
    return value !== undefined ? value : defaultValue;
};

global.setSetting = async (guildId, key, value) => {
    if (!global.botCache.has(guildId)) {
        global.botCache.set(guildId, new Map());
    }
    const srvSettings = global.botCache.get(guildId);
    if (srvSettings instanceof Map) {
        srvSettings.set(key, value);
    } else {
        srvSettings[key] = value;
    }

    try {
        await ServerModel.findOneAndUpdate(
            { guildId: guildId },
            { $set: { [`settings.${key}`]: value } },
            { upsert: true }
        );
    } catch (error) {
        console.error(`🔴 Error al guardar configuración (${key}) en MongoDB para el servidor${guildId}:`, error);
    }
};
// ========================================================

// Owners Management
const CREADORES_IDS = [
    '1306621378291564565',
    '1419053430697234603'
]; 

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent
    ],
    ws: {
        properties: {
            browser: 'Discord Android'
        }
    },
    presence: {
        status: 'online',
        activities: [{
            name: '¡En vivo en Twitch!',
            type: ActivityType.Streaming,
            url: 'https://www.twitch.tv/discord'
        }]
    }
});

const PREFIX = ';';

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

if (!TOKEN || !CLIENT_ID) {
    console.error('❌ Faltan DISCORD_TOKEN o CLIENT_ID en tu archivo .env.');
    process.exit(1);
}

const ARCHIVO_CONFIG = path.join(__dirname, 'config.json');

const BOT_INVITE_PERMISSIONS = new PermissionsBitField([
    PermissionFlagsBits.KickMembers,
    PermissionFlagsBits.BanMembers,
    PermissionFlagsBits.ManageChannels,
    PermissionFlagsBits.ManageRoles,
    PermissionFlagsBits.ModerateMembers,
    PermissionFlagsBits.ManageNicknames,
    PermissionFlagsBits.ManageMessages,
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.SendMessages,
    PermissionFlagsBits.EmbedLinks,
    PermissionFlagsBits.ReadMessageHistory,
    PermissionFlagsBits.CreateInstantInvite
]).bitfield.toString();

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('🤖 CPU v2 - En Linea');
});

app.listen(PORT, () => {
    console.log(`🌐 [CPU v2] Servidor web de monitoreo activo en el puerto ${PORT}`);
});

if (!fs.existsSync(ARCHIVO_CONFIG)) fs.writeFileSync(ARCHIVO_CONFIG, JSON.stringify({}), 'utf8');

function obtenerConfig() {
    try { return JSON.parse(fs.readFileSync(ARCHIVO_CONFIG, 'utf8')); } catch { return {}; }
}
function guardarConfig(data) {
    fs.writeFileSync(ARCHIVO_CONFIG, JSON.stringify(data, null, 2), 'utf8');
}

function getGuildConfig(guildId) {
    const config = obtenerConfig();
    let entry = config[guildId];
    if (!entry || typeof entry === 'string') {
        entry = { postulaciones: entry || null };
    }
    return entry;
}
function setGuildConfig(guildId, updates) {
    const config = obtenerConfig();
    let entry = config[guildId];
    if (!entry || typeof entry === 'string') {
        entry = { postulaciones: entry || null };
    }
    config[guildId] = { ...entry, ...updates };
    guardarConfig(config);
    return config[guildId];
}

function esMiembroStaff(member, guildId) {
    if (CREADORES_IDS.includes(member.id)) return true;
    if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
    const cfg = getGuildConfig(guildId);
    if (cfg.staffRole && member.roles.cache.has(cfg.staffRole)) return true;
    return false;
}

function warnKey(guildId, userId) {
    return `${guildId}-${userId}`;
}

function embedToContainer(embed) {
    const data = embed.data || {};
    const container = new ContainerBuilder();
    if (typeof data.color === 'number') container.setAccentColor(data.color);

    const partes = [];
    if (data.title) partes.push(`## ${data.title}`);
    if (data.description) partes.push(data.description);
    const textoTitulo = new TextDisplayBuilder().setContent(partes.join('\n') || '\u200b');

    if (data.thumbnail && data.thumbnail.url) {
        container.addSectionComponents(
            new SectionBuilder()
                .addTextDisplayComponents(textoTitulo)
                .setThumbnailAccessory(new ThumbnailBuilder().setURL(data.thumbnail.url))
        );
    } else {
        container.addTextDisplayComponents(textoTitulo);
    }

    if (data.fields && data.fields.length) {
        container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.None).setDivider(true));
        const textoCampos = data.fields.map(f => `**${f.name}**\n${f.value}`).join('\n\n');
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(textoCampos));
    }

    if (data.footer && data.footer.text) {
        container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.None).setDivider(false));
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# ${data.footer.text}`));
    }

    return container;
}

async function logModeracion(guild, embed, components = []) {
    const cfg = getGuildConfig(guild.id);
    if (!cfg.modActions) return;
    const canal = guild.channels.cache.get(cfg.modActions);
    if (!canal) return;
    try { await canal.send({ components: [embedToContainer(embed), ...components], flags: MessageFlags.IsComponentsV2 }); } catch (e) { }
}

function construirEmbedTicket(nombreUsuario, atendidoPor) {
    return new EmbedBuilder()
        .setTitle('🎫 Ticket de Soporte')
        .setColor('#5865F2')
        .addFields(
            { name: 'Usuario', value: `${nombreUsuario}`, inline: true },
            { name: 'Atendido por', value: atendidoPor || 'Nadie aún', inline: true },
            { name: 'Instrucciones', value: 'Describe tu duda o problema con detalle. El Staff te atenderá en breve.', inline: false }
        )
        .setFooter({ text: 'CPU v2' })
        .setTimestamp();
}

async function crearTicket(guild, member, abiertoPor) {
    const cfg = getGuildConfig(guild.id);
    if (!cfg.ticketsCategory) {
        return { ok: false, motivo: '⚠️ El sistema de tickets no ha sido configurado. Pide a un administrador usar `/setup tickets`.' };
    }

    const categoria = guild.channels.cache.get(cfg.ticketsCategory);
    if (!categoria) {
        return { ok: false, motivo: '⚠️ La categoría configurada ya no existe. Pide a un administrador reconfigurarla con `/setup tickets`.' };
    }

    const ticketExistente = categoria.children.cache.find(c => c.topic === `ticket-owner:${member.id}`);
    if (ticketExistente) {
        return { ok: false, motivo: `⚠️ Ese usuario ya tiene un ticket abierto: <#${ticketExistente.id}>`, canalExistente: ticketExistente };
    }

    const nombreBase = member.user.username.toLowerCase().replace(/[^a-z0-9]/g, '') || member.id;

    const overwritesMap = new Map();
    overwritesMap.set(guild.roles.everyone.id, { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] });
    overwritesMap.set(member.id, { id: member.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });
    overwritesMap.set(client.user.id, { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ReadMessageHistory] });

    guild.roles.cache.forEach(rolServidor => {
        if (rolServidor.permissions.has(PermissionFlagsBits.Administrator) || rolServidor.permissions.has(PermissionFlagsBits.ManageChannels)) {
            overwritesMap.set(rolServidor.id, { id: rolServidor.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });
        }
    });

    const rolNotif = cfg.staffRole || cfg.ticketsRole;
    if (rolNotif) {
        overwritesMap.set(rolNotif, { id: rolNotif, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });
    }

    const overwrites = Array.from(overwritesMap.values());

    let canalTicket;
    try {
        canalTicket = await guild.channels.create({
            name: `ticket-${nombreBase}`,
            type: ChannelType.GuildText,
            parent: categoria.id,
            topic: `ticket-owner:${member.id}`,
            permissionOverwrites: overwrites
        });
    } catch (error) {
        console.error('Error al crear canal de ticket:', error);
        return { ok: false, motivo: '❌ No pude crear el canal del ticket. Revisa mis permisos de Gestionar Canales.' };
    }

    const abiertoPorStaff = abiertoPor && abiertoPor.id !== member.id;
    const embedTicket = construirEmbedTicket(member.user.username, abiertoPorStaff ? abiertoPor.username : null);

    const botones = abiertoPorStaff
        ? [new ButtonBuilder().setCustomId('cerrar_ticket').setLabel('Cerrar Ticket').setEmoji('🔒').setStyle(ButtonStyle.Danger)]
        : [
            new ButtonBuilder().setCustomId('tomar_ticket').setLabel('Tomar Ticket').setEmoji('🖐️').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('cerrar_ticket').setLabel('Cerrar Ticket').setEmoji('🔒').setStyle(ButtonStyle.Danger)
        ];
    const rowTicket = new ActionRowBuilder().addComponents(...botones);

    const mencionStaff = rolNotif ? `<@&${rolNotif}>` : '';
    const textoMencion = `${mencionStaff} <@${member.id}>`.trim();
    await canalTicket.send({
        components: [
            new TextDisplayBuilder().setContent(textoMencion),
            embedToContainer(embedTicket),
            rowTicket
        ],
        flags: MessageFlags.IsComponentsV2
    });

    return { ok: true, channel: canalTicket };
}

const commands = [
    new SlashCommandBuilder()
        .setName('staff')
        .setDescription('Comandos de administración del Staff')
        .addSubcommand(sub =>
            sub.setName('perms')
               .setDescription('Establece el rol oficial de Staff para permitir el uso de comandos administrativos')
               .addRoleOption(opt => opt.setName('rol').setDescription('Rol asignado al Staff del servidor').setRequired(true))
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Expulsa a un miembro del servidor')
        .addUserOption(opt => opt.setName('usuario').setDescription('El miembro a expulsar').setRequired(true))
        .addStringOption(opt => opt.setName('razon').setDescription('Motivo detallado')),

    new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Banea a un miembro del Servidor')
        .addUserOption(opt => opt.setName('usuario').setDescription('El miembro a banear').setRequired(true))
        .addStringOption(opt => opt.setName('razon').setDescription('Motivo detallado')),

    new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Revoca el baneo de un usuario mediante su ID')
        .addStringOption(opt => opt.setName('id').setDescription('ID de Discord del usuario').setRequired(true)),

    new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Aísla/Silencia temporalmente a un miembro')
        .addUserOption(opt => opt.setName('usuario').setDescription('El miembro a aislar').setRequired(true))
        .addIntegerOption(opt => 
            opt.setName('minutos')
                .setDescription('Duración del aislamiento')
                .setRequired(true)
                .addChoices(
                    { name: '1 Minuto', value: 1 },
                    { name: '5 Minutos', value: 5 },
                    { name: '10 Minutos', value: 10 },
                    { name: '1 Hora', value: 60 },
                    { name: '1 Día', value: 1440 },
                    { name: '1 Semana', value: 10080 }
                )
        )
        .addStringOption(opt => opt.setName('razon').setDescription('Motivo detallado')),

    new SlashCommandBuilder()
        .setName('unmute')
        .setDescription('Remueve el aislamiento/silencio de un miembro')
        .addUserOption(opt => opt.setName('usuario').setDescription('El miembro a restablecer').setRequired(true)),

    new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Registra una advertencia formal')
        .addUserOption(opt => opt.setName('usuario').setDescription('El miembro a advertir').setRequired(true))
        .addStringOption(opt => opt.setName('razon').setDescription('Motivo')),

    new SlashCommandBuilder()
        .setName('warns')
        .setDescription('Gestiona el historial de advertencias de un miembro')
        .addSubcommand(sub =>
            sub.setName('view')
               .setDescription('Consulta el historial de advertencias')
               .addUserOption(opt => opt.setName('usuario').setDescription('El miembro a consultar').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('clear')
               .setDescription('Limpia el historial de advertencias de un miembro')
               .addUserOption(opt => opt.setName('usuario').setDescription('El miembro a limpiar').setRequired(true))
        ),

    new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('Muestra información detallada de un miembro')
        .addUserOption(opt => opt.setName('usuario').setDescription('Miembro a consultar (por defecto: tú mismo)').setRequired(false)),

    new SlashCommandBuilder()
        .setName('cmdcheck')
        .setDescription('Verifica los permisos que posee un miembro en el servidor')
        .addUserOption(opt => opt.setName('usuario').setDescription('Miembro a consultar (por defecto: tú mismo)').setRequired(false)),

    new SlashCommandBuilder()
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

    new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Limpia mensajes masivamente')
        .addIntegerOption(opt => opt.setName('cantidad').setDescription('Cantidad (1-10000)').setRequired(true).setMinValue(1).setMaxValue(10000)),

    new SlashCommandBuilder()
        .setName('nick')
        .setDescription('Modifica tu apodo o el de otro miembro')
        .addStringOption(opt => opt.setName('apodo').setDescription('Nuevo apodo (vacío para restablecer)').setRequired(false))
        .addUserOption(opt => opt.setName('usuario').setDescription('Miembro a modificar (Solo Administradores)').setRequired(false)),

    new SlashCommandBuilder()
        .setName('postularse')
        .setDescription('Inicia tu proceso de postulación mediante MD'),

    new SlashCommandBuilder()
        .setName('set-canal-postulaciones')
        .setDescription('Configura el canal para recibir postulaciones')
        .addChannelOption(opt => opt.setName('canal').setDescription('Canal de recepción').addChannelTypes(ChannelType.GuildText).setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
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

    new SlashCommandBuilder()
        .setName('setup-rol-soporte')
        .setDescription('Establece el rol de Staff que se mencionará al abrirse un ticket')
        .addRoleOption(opt => opt.setName('rol').setDescription('Rol de soporte').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName('setup-panel-tickets')
        .setDescription('Envía el panel de soporte con el botón para abrir tickets en este canal')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName('open')
        .setDescription('Abre un ticket de soporte a nombre de otro usuario (uso del Staff)')
        .addUserOption(opt => opt.setName('usuario').setDescription('Usuario al que se le abrirá el ticket').setRequired(true)),

    new SlashCommandBuilder()
        .setName('send')
        .setDescription('Envía un mensaje normal en el canal (uso del Staff)')
        .addStringOption(opt => opt.setName('mensaje').setDescription('Contenido del mensaje a enviar').setRequired(true)),

    new SlashCommandBuilder()
        .setName('embed')
        .setDescription('Crea y envía un Embed personalizado mediante un formulario (uso del Staff)'),

    new SlashCommandBuilder()
        .setName('softban')
        .setDescription('Expulsa al usuario y borra sus mensajes recientes, sin banearlo permanentemente')
        .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a expulsar').setRequired(true))
        .addStringOption(opt => opt.setName('razon').setDescription('Razón de la expulsión').setRequired(false))
        .addStringOption(opt => opt.setName('borrar-mensajes').setDescription('Mensajes a eliminar (por defecto, ninguno)').setRequired(false)
            .addChoices(
                { name: 'Última 1 hora', value: '3600' },
                { name: 'Últimas 6 horas', value: '21600' },
                { name: 'Últimas 12 horas', value: '43200' },
                { name: 'Último 1 día', value: '86400' },
                { name: 'Últimos 3 días', value: '259200' },
                { name: 'Últimos 7 días', value: '604800' }
            )),

].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

client.once('ready', async () => {
    console.log(`🚀 [CPU v2] Núcleo operativo inicializado y activo como ${client.user.tag}`);

    try {
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
        console.log('✅ [CPU v2] Comandos de barra sincronizados de forma global.');
    } catch (error) {
        console.error('❌ [CPU v2] Error crítico al sincronizar comandos:', error);
    }
});

client.on('interactionCreate', async interaction => {
    if (interaction.isModalSubmit()) {
        if (interaction.customId === 'modal_comando_embed') {
            const titulo = interaction.fields.getTextInputValue('input_embed_titulo');
            const contenido = interaction.fields.getTextInputValue('input_embed_contenido');
            const footer = interaction.fields.getTextInputValue('input_embed_footer');

            try {
                const container = new ContainerBuilder().setAccentColor(0x5865F2);

                // 1. Título principal
                if (titulo && titulo.trim().length > 0) {
                    container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`# ${titulo.trim()}`)
                    );
                    container.addSeparatorComponents(
                        new SeparatorBuilder()
                            .setSpacing(SeparatorSpacingSize.None)
                            .setDivider(true)
                    );
                }

                // 2. Procesamiento del contenido con {sp} y saltos de línea múltiples
                if (contenido && contenido.trim().length > 0) {
                    // Dividimos en bloques por la etiqueta {sp} (que crea divisores con línea visible)
                    const bloquesSp = contenido.split('{sp}');

                    bloquesSp.forEach((bloque, indexSp) => {
                        // Dentro de cada bloque {sp}, procesamos los párrafos por salto de línea doble (Enter dos veces)
                        const lineas = bloque.split(/\n\s*\n/);

                        lineas.forEach((linea, indexLinea) => {
                            const textoLimpio = linea.trim();
                            if (textoLimpio.length > 0) {
                                container.addTextDisplayComponents(
                                    new TextDisplayBuilder().setContent(textoLimpio)
                                );

                                // Si hay más párrafos dentro del mismo bloque {sp}, añadimos un separador sin línea visible
                                if (indexLinea < lineas.length - 1) {
                                    container.addSeparatorComponents(
                                        new SeparatorBuilder()
                                            .setSpacing(SeparatorSpacingSize.None)
                                            .setDivider(false)
                                    );
                                }
                            }
                        });

                        // Si hay más bloques separados por {sp}, añadimos un separador con línea divisoria visible
                        if (indexSp < bloquesSp.length - 1) {
                            container.addSeparatorComponents(
                                new SeparatorBuilder()
                                    .setSpacing(SeparatorSpacingSize.None)
                                    .setDivider(true)
                            );
                        }
                    });
                }

                // 3. Pie de página (Footer)
                if (footer && footer.trim().length > 0) {
                    container.addSeparatorComponents(
                        new SeparatorBuilder()
                            .setSpacing(SeparatorSpacingSize.None)
                            .setDivider(true)
                    );
                    container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`-# ${footer.trim()}`)
                    );
                }

                await interaction.channel.send({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2
                });

                return await interaction.reply({ content: '✅ Embed enviado con éxito.', ephemeral: true });
            } catch (error) {
                console.error('Error al construir/enviar el embed personalizado:', error);
                return interaction.reply({ content: '❌ Ocurrió un error al enviar el Embed.', ephemeral: true }).catch(() => {});
            }
        }
        return;
    }

    if (!interaction.isChatInputCommand()) return;

    const { commandName, options, guild, user, channel, member } = interaction;
    const usuario = options.getMember('usuario');
    const razon = options.getString('razon') || 'Ninguna especificada.';

    const comandosStaff = ['kick', 'ban', 'softban', 'unban', 'mute', 'unmute', 'warn', 'warns', 'role', 'clear', 'open', 'send', 'embed'];
    if (comandosStaff.includes(commandName)) {
        if (!esMiembroStaff(member, guild.id)) {
            return interaction.reply({ content: '❌ Acceso denegado: Necesitas el rol de Staff o permisos de Administrador para usar este comando.', ephemeral: true });
        }
    }

    if (commandName === 'staff') {
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

    if (commandName === 'kick') {
        if (!usuario) return interaction.reply({ content: '❌ El objetivo especificado no se encuentra en el servidor.', ephemeral: true });
        if (!usuario.kickable) return interaction.reply({ content: '❌ Operación denegada: Privilegios insuficientes o jerarquía superior.', ephemeral: true });

        try {
            await usuario.kick(razon);

            const embed = new EmbedBuilder()
                .setTitle('BOOT Miembro Expulsado')
                .setColor('#F2A30F')
                .setThumbnail(usuario.user.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: 'Miembro', value: `${usuario.user.username}`, inline: true },
                    { name: 'Moderador', value: `${user.username}`, inline: true },
                    { name: 'Razón', value: razon, inline: false }
                )
                .setFooter({ text: 'CPU v2' })
                .setTimestamp();

            await logModeracion(guild, embed);
            return interaction.reply({ components: [embedToContainer(embed)], flags: MessageFlags.IsComponentsV2 });
        } catch (error) {
            console.error('Error en /kick:', error);
            return interaction.reply({ content: '❌ Ocurrió un error al intentar expulsar al miembro.', ephemeral: true });
        }
    }

    if (commandName === 'ban') {
        if (!usuario) return interaction.reply({ content: '❌ El objetivo especificado no se encuentra en el servidor.', ephemeral: true });
        if (!usuario.bannable) return interaction.reply({ content: '❌ Operación denegada: El miembro posee inmunidad o un rol superior.', ephemeral: true });

        const cfgBan = getGuildConfig(guild.id);
        const filaApelacion = cfgBan.apelacionLink ? [new ActionRowBuilder().addComponents(
            new ButtonBuilder().setLabel('Apelar Sanción').setEmoji('📨').setStyle(ButtonStyle.Link).setURL(cfgBan.apelacionLink)
        )] : [];

        const embed = new EmbedBuilder()
            .setTitle('🔨 Miembro Baneado')
            .setColor('#ED4245')
            .setThumbnail(usuario.user.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: 'Miembro', value: `${usuario.user.username}`, inline: true },
                { name: 'Moderador', value: `${user.username}`, inline: true },
                { name: 'Razón', value: razon, inline: false }
            )
            .setFooter({ text: 'CPU v2' })
            .setTimestamp();

        try { await usuario.send({ components: [embedToContainer(embed), ...filaApelacion], flags: MessageFlags.IsComponentsV2 }); } catch (e) { }

        try {
            await guild.members.ban(usuario.id, { reason: razon });
            await logModeracion(guild, embed, filaApelacion);
            return interaction.reply({ components: [embedToContainer(embed)], flags: MessageFlags.IsComponentsV2 });
        } catch (error) {
            console.error('Error en /ban:', error);
            return interaction.reply({ content: '❌ Ocurrió un error al intentar banear al miembro.', ephemeral: true });
        }
    }

    if (commandName === 'softban') {
        if (!usuario) return interaction.reply({ content: '❌ El objetivo especificado no se encuentra en el servidor.', ephemeral: true });
        if (!usuario.bannable) return interaction.reply({ content: '❌ Operación denegada: El miembro posee inmunidad o un rol superior.', ephemeral: true });

        const segundosBorrar = parseInt(options.getString('borrar-mensajes') || '0', 10);

        const embed = new EmbedBuilder()
            .setTitle('🧹 Miembro Expulsado (Softban)')
            .setColor('#ED4245')
            .setThumbnail(usuario.user.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: 'Miembro', value: `${usuario.user.username}`, inline: true },
                { name: 'Moderador', value: `${user.username}`, inline: true },
                { name: 'Razón', value: razon, inline: false }
            )
            .setFooter({ text: 'CPU v2' })
            .setTimestamp();

        try {
            await guild.members.ban(usuario.id, { reason: razon, deleteMessageSeconds: segundosBorrar });
            await guild.members.unban(usuario.id, 'Softban: se libera el baneo tras limpiar mensajes').catch(() => {});
            await logModeracion(guild, embed);
            return interaction.reply({ components: [embedToContainer(embed)], flags: MessageFlags.IsComponentsV2 });
        } catch (error) {
            console.error('Error en /softban:', error);
            return interaction.reply({ content: '❌ Ocurrió un error al intentar aplicar el softban.', ephemeral: true });
        }
    }

    if (commandName === 'unban') {
        const userId = options.getString('id');
        try {
            await guild.members.unban(userId);

            const embed = new EmbedBuilder()
                .setTitle('✅ Baneo Revocado')
                .setColor('#57F287')
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

    if (commandName === 'mute') {
        if (!usuario) return interaction.reply({ content: '❌ El objetivo especificado no se encuentra en el servidor.', ephemeral: true });
        const minutes = options.getInteger('minutos');
        if (!usuario.moderatable) return interaction.reply({ content: '❌ Operación denegada: Imposible aplicar aislamiento a este rango.', ephemeral: true });

        try {
            await usuario.timeout(minutes * 60 * 1000, razon);

            const embed = new EmbedBuilder()
                .setTitle('🔇 Miembro Silenciado')
                .setColor('#FEE75C')
                .setThumbnail(usuario.user.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: 'Miembro', value: `${usuario.user.username}`, inline: true },
                    { name: 'Duración', value: `${minutes} min`, inline: true },
                    { name: 'Moderador', value: `${user.username}`, inline: true },
                    { name: 'Razón', value: razon, inline: false }
                )
                .setFooter({ text: 'CPU v2' })
                .setTimestamp();

            await logModeracion(guild, embed);
            return interaction.reply({ components: [embedToContainer(embed)], flags: MessageFlags.IsComponentsV2 });
        } catch (error) {
            console.error('Error en /mute:', error);
            return interaction.reply({ content: '❌ Ocurrió un error al intentar silenciar al miembro.', ephemeral: true });
        }
    }

    if (commandName === 'unmute') {
        if (!usuario) return interaction.reply({ content: '❌ El objetivo especificado no se encuentra en el servidor.', ephemeral: true });
        if (!usuario.moderatable) return interaction.reply({ content: '❌ No poseo la autoridad para modificar el estado de este miembro.', ephemeral: true });
        if (!usuario.communicationDisabledUntilTimestamp) return interaction.reply({ content: 'ℹ️ El miembro seleccionado no se encuentra bajo régimen de aislamiento.', ephemeral: true });

        await usuario.timeout(null);

        const embed = new EmbedBuilder()
            .setTitle('🔊 Silencio Removido')
            .setColor('#57F287')
            .addFields(
                { name: 'Miembro', value: `${usuario.user.username}`, inline: true },
                { name: 'Moderador', value: `${user.username}`, inline: true }
            )
            .setFooter({ text: 'CPU v2' })
            .setTimestamp();

        await logModeracion(guild, embed);
        return interaction.reply({ components: [embedToContainer(embed)], flags: MessageFlags.IsComponentsV2 });
    }

    if (commandName === 'warn') {
        if (!usuario) return interaction.reply({ content: '❌ El objetivo especificado no se encuentra en el servidor.', ephemeral: true });
        if (usuario.user.bot) return interaction.reply({ content: '❌ Los perfiles automatizados (bots) no pueden recibir amonestaciones.', ephemeral: true });

        try {
            const idWarn = warnKey(guild.id, usuario.id);
            const nuevaAdvertencia = {
                moderador: user.tag,
                razon: razon,
                fecha: new Date().toLocaleDateString()
            };

            const registro = await WarnModel.findOneAndUpdate(
                { key: idWarn },
                { $push: { warns: nuevaAdvertencia } },
                { new: true, upsert: true }
            );

            const totalWarns = registro.warns.length;

            const embed = new EmbedBuilder()
                .setTitle('⚠️ Miembro Advertido')
                .setColor('#ED4245')
                .setThumbnail(usuario.user.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: 'Miembro Advertido', value: `${usuario.user.username}`, inline: true },
                    { name: 'Historial de Warns', value: `${totalWarns}`, inline: true },
                    { name: 'Razón', value: razon, inline: false }
                )
                .setFooter({ text: 'CPU v2' })
                .setTimestamp();

            await logModeracion(guild, embed);
            return interaction.reply({ components: [embedToContainer(embed)], flags: MessageFlags.IsComponentsV2 });
        } catch (error) {
            console.error('Error en /warn:', error);
            return interaction.reply({ content: '❌ Ocurrió un error al registrar la advertencia en MongoDB.', ephemeral: true });
        }
    }

    if (commandName === 'warns') {
        if (!usuario) return interaction.reply({ content: '❌ El objetivo especificado no se encuentra en el servidor.', ephemeral: true });
        const sub = options.getSubcommand();
        const idWarn = warnKey(guild.id, usuario.id);

        try {
            const registroWarns = await WarnModel.findOne({ key: idWarn });
            const usuarioWarns = registroWarns ? registroWarns.warns : [];

            if (sub === 'view') {
                const embed = new EmbedBuilder()
                    .setThumbnail(usuario.user.displayAvatarURL({ dynamic: true }))
                    .setTimestamp();

                if (usuarioWarns.length === 0) {
                    embed.setTitle('📋 Historial de Advertencias')
                         .setColor('#57F287')
                         .addFields(
                            { name: 'Miembro', value: `${usuario.user.username}`, inline: true },
                            { name: 'Estado', value: 'Sin advertencias', inline: true }
                         );
                    return interaction.reply({ components: [embedToContainer(embed)], flags: MessageFlags.IsComponentsV2 });
                }

                embed.setTitle('📋 Historial de Advertencias')
                     .setColor('#F2A30F')
                     .addFields(
                        { name: 'Miembro', value: `${usuario.user.username}`, inline: true },
                        { name: 'Total', value: `${usuarioWarns.length}`, inline: true }
                     );

                usuarioWarns.forEach((w, index) => {
                    embed.addFields({
                        name: `#${index + 1} —${w.fecha}`,
                        value: `Mod: ${w.moderador} • Razón: ${w.razon}`
                    });
                });

                return interaction.reply({ components: [embedToContainer(embed)], flags: MessageFlags.IsComponentsV2 });
            }

            if (sub === 'clear') {
                if (usuarioWarns.length === 0) {
                    return interaction.reply({ content: `ℹ️ **${usuario.user.username}** ya no tiene advertencias registradas.`, ephemeral: true });
                }

                await WarnModel.deleteOne({ key: idWarn });

                const embed = new EmbedBuilder()
                    .setTitle('🧹 Historial Limpiado')
                    .setColor('#57F287')
                    .addFields(
                        { name: 'Miembro', value: `${usuario.user.username}`, inline: true },
                        { name: 'Moderador', value: `${user.username}`, inline: true }
                    )
                    .setFooter({ text: 'CPU v2' })
                    .setTimestamp();

                return interaction.reply({ components: [embedToContainer(embed)], flags: MessageFlags.IsComponentsV2 });
            }
        } catch (error) {
            console.error('Error en /warns:', error);
            return interaction.reply({ content: '❌ Ocurrió un error al procesar la solicitud con MongoDB.', ephemeral: true });
        }
    }

    if (commandName === 'role') {
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

    if (commandName === 'clear') {
        const cantidad = options.getInteger('cantidad');
        try {
            const borrados = await channel.bulkDelete(cantidad, true);
            return interaction.reply({ 
                content: `🧹 **Mantenimiento Completado:** Se han purgado **${borrados.size} mensajes** del canal de forma segura.`, 
                ephemeral: true 
            });
        } catch (error) {
            return interaction.reply({ content: '❌ Imposible eliminar mensajes con una antigüedad mayor a 14 días.', ephemeral: true });
        }
    }

    if (commandName === 'nick') {
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

    if (commandName === 'userinfo') {
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

    if (commandName === 'cmdcheck') {
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

    if (commandName === 'set-canal-postulaciones') {
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

    if (commandName === 'setup') {
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

    if (commandName === 'setup-rol-soporte') {
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

    if (commandName === 'setup-panel-tickets') {
        const cfg = getGuildConfig(guild.id);
        if (!cfg.ticketsCategory) {
            return interaction.reply({ content: '⚠️ Primero configura la categoría con `/setup tickets`.', ephemeral: true });
        }

        const embedPanel = new EmbedBuilder()
            .setTitle('🎫 Soporte al Miembro')
            .setColor('#5865F2')
            .setDescription('¿Necesitas ayuda o tienes una duda? Presiona el botón para abrir un ticket privado con el Staff.')
            .setFooter({ text: 'CPU v2' })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('abrir_ticket').setLabel('Abrir Ticket').setEmoji('🎫').setStyle(ButtonStyle.Primary)
        );

        await channel.send({ components: [embedToContainer(embedPanel), row], flags: MessageFlags.IsComponentsV2 });
        return interaction.reply({ content: '✅ Panel de tickets enviado.', ephemeral: true });
    }

    if (commandName === 'open') {
        const miembroObjetivo = options.getMember('usuario');
        if (!miembroObjetivo) {
            return interaction.reply({ content: '❌ Ese usuario no se encuentra en el servidor.', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        const resultado = await crearTicket(guild, miembroObjetivo, user);
        if (!resultado.ok) {
            return interaction.editReply({ content: resultado.motivo });
        }

        return interaction.editReply({ content: `✅ Ticket abierto para **${miembroObjetivo.user.username}**: <#${resultado.channel.id}>` });
    }

    if (commandName === 'send') {
        const contenidoMensaje = options.getString('mensaje');

        try {
            await channel.send({ content: contenidoMensaje });
            return interaction.reply({ content: '✅ Mensaje enviado con éxito.', ephemeral: true });
        } catch (error) {
            console.error('Error en /send:', error);
            return interaction.reply({ content: '❌ No pude enviar el mensaje en este canal.', ephemeral: true });
        }
    }

    if (commandName === 'embed') {
        const modal = new ModalBuilder()
            .setCustomId('modal_comando_embed')
            .setTitle('Crear Embed Personalizado');

        const inputTitulo = new TextInputBuilder()
            .setCustomId('input_embed_titulo')
            .setLabel('Título del Embed')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Ej: Anuncio Oficial')
            .setRequired(false);

        const inputContenido = new TextInputBuilder()
            .setCustomId('input_embed_contenido')
            .setLabel('Contenido / Descripción (Usa {sp} para línea)')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Escribe el texto aquí. Usa {sp} donde quieras colocar una línea separadora.')
            .setRequired(true)
            .setMaxLength(4000);

        const inputFooter = new TextInputBuilder()
            .setCustomId('input_embed_footer')
            .setLabel('Pie de página (Footer)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Ej: Servidor de Discord • 2026')
            .setRequired(false);

        modal.addComponents(
            new ActionRowBuilder().addComponents(inputTitulo),
            new ActionRowBuilder().addComponents(inputContenido),
            new ActionRowBuilder().addComponents(inputFooter)
        );

        return await interaction.showModal(modal);
    }

    if (commandName === 'postularse') {
        const canalId = getGuildConfig(guild.id).postulaciones;

        if (!canalId) {
            return interaction.reply({ 
                content: '⚠️ El sistema de postulaciones no ha sido configurado. Pide a un administrador usar `/set-canal-postulaciones`.', 
                ephemeral: true 
            });
        }

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('iniciar_postulacion').setLabel('Aceptar').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('cancelar_postulacion').setLabel('Rechazar').setStyle(ButtonStyle.Danger)
        );

        const embedMD = new EmbedBuilder()
            .setTitle(`📜 Postulación — ${guild.name}`)
            .setColor('#57F287')
            .setDescription(`Hola **${user.username}**, presiona **Aceptar** para iniciar tu postulación o **Rechazar** para cancelar.`)
            .setThumbnail(guild.iconURL({ dynamic: true }))
            .setFooter({ text: 'CPU v2' })
            .setTimestamp();

        try {
            const mensajeDM = await user.send({ components: [embedToContainer(embedMD), row], flags: MessageFlags.IsComponentsV2 });
            await interaction.reply({ content: '📬 Te hemos enviado un MD para comenzar tu postulación.', ephemeral: true });

            const collector = mensajeDM.createMessageComponentCollector({ time: 60000 });
            let respondido = false;

            collector.on('collect', async i => {
                respondido = true;
                if (i.customId === 'cancelar_postulacion') {
                    await i.update({ components: [new TextDisplayBuilder().setContent('❌ Has cancelado la postulación.')], flags: MessageFlags.IsComponentsV2 });
                    return;
                }

                if (i.customId === 'iniciar_postulacion') {
                    await i.update({ components: [new TextDisplayBuilder().setContent('📝 **Proceso Iniciado.** Responde a las siguientes preguntas directamente por este chat.')], flags: MessageFlags.IsComponentsV2 });

                    const preguntas = [
                        '1️⃣ ¿Qué edad tienes? (Requisitos: +15)',
                        '2️⃣ ¿Tienes experiencia previa como Moderador o Staff?',
                        '3️⃣ ¿Cuántas horas diarias podrías dedicar?',
                        '4️⃣ Prueba: ¿Que harias al ver una discusion?'
                    ];

                    const respuestas = [];
                    const dmChannel = await user.createDM();

                    for (const preg of preguntas) {
                        await dmChannel.send(`📌 **Pregunta:** ${preg}`);
                        try {
                            const resp = await dmChannel.awaitMessages({
                                filter: m => m.author.id === user.id,
                                max: 1,
                                time: 180000,
                                errors: ['time']
                            });
                            respuestas.push(resp.first().content);
                        } catch (e) {
                            return dmChannel.send('⏳ Se agotó el tiempo de respuesta. Postulación cancelada.');
                        }
                    }

                    const canalDestino = guild.channels.cache.get(canalId);
                    if (canalDestino) {
                        const embedExpediente = new EmbedBuilder()
                            .setTitle('📥 Nueva Postulación')
                            .setColor('#FEE75C')
                            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                            .addFields(
                                { name: 'Candidato', value: `${user.username}`, inline: false },
                                { name: preguntas[0], value: respuestas[0] },
                                { name: preguntas[1], value: respuestas[1] },
                                { name: preguntas[2], value: respuestas[2] },
                                { name: preguntas[3], value: respuestas[3] }
                            )
                            .setFooter({ text: 'CPU v2' })
                            .setTimestamp();

                        await canalDestino.send({ components: [embedToContainer(embedExpediente)], flags: MessageFlags.IsComponentsV2 });
                        await dmChannel.send('✅ **¡Postulación enviada con éxito!** Tus respuestas han sido entregadas.');
                    } else {
                        await dmChannel.send('⚠️ Hubo un error al entregar el expediente. Contacta a un administrador.');
                    }
                }
            });

            collector.on('end', async () => {
                if (!respondido) {
                    try {
                        await mensajeDM.edit({ components: [new TextDisplayBuilder().setContent('⏳ El tiempo para responder expiró. Usa `/postularse` de nuevo si deseas continuar.')], flags: MessageFlags.IsComponentsV2 });
                    } catch (e) { }
                }
            });

        } catch (error) {
            return interaction.reply({ content: '❌ No pude enviarte un mensaje privado. Revisa tus ajustes de privacidad.', ephemeral: true });
        }
    }
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;
    if (!message.guild) return;
    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
    const comando = args.shift().toLowerCase();

    if (comando === 'softban') {
        if (!esMiembroStaff(message.member, message.guild.id)) {
            return message.reply({ content: '❌ Acceso denegado: Requieres ser Staff o tener permisos de Administrador.' });
        }

        const usuario = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
        if (!usuario) {
            return message.reply({ content: '⚠️ **Uso correcto:** `;softban @usuario [segundos_borrado] [razón]`' });
        }

        if (!usuario.bannable) {
            return message.reply({ content: '❌ Operación denegada: El miembro posee inmunidad o un rol superior.' });
        }

        let segundosBorrar = parseInt(args[1], 10);
        let razon = args.slice(2).join(' ');

        if (isNaN(segundosBorrar)) {
            segundosBorrar = 86400;
            razon = args.slice(1).join(' ') || 'Softban aplicado vía comando con prefijo.';
        } else {
            razon = razon || 'Softban aplicado vía comando con prefijo.';
        }

        if (segundosBorrar > 604800) segundosBorrar = 604800;

        const embed = new EmbedBuilder()
            .setTitle('🧹 Miembro Expulsado (Softban)')
            .setColor('#ED4245')
            .setThumbnail(usuario.user.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: 'Miembro', value: `${usuario.user.username}`, inline: true },
                { name: 'Moderador', value: `${message.author.username}`, inline: true },
                { name: 'Razón', value: razon, inline: false }
            )
            .setFooter({ text: 'CPU v2' })
            .setTimestamp();

        try {
            await message.guild.members.ban(usuario.id, { reason: razon, deleteMessageSeconds: segundosBorrar });
            await message.guild.members.unban(usuario.id, 'Softban: se libera el baneo tras purgar mensajes').catch(() => {});
            await logModeracion(message.guild, embed);

            return message.reply({ components: [embedToContainer(embed)], flags: MessageFlags.IsComponentsV2 });
        } catch (error) {
            console.error('Error al ejecutar softban por prefijo:', error);
            return message.reply({ content: '❌ Ocurrió un error al intentar aplicar el softban.' });
        }
    }

    if (comando === 'setstatus') {
        if (!CREADORES_IDS.includes(message.author.id)) {
            return message.reply({ content: '❌ Este comando es de uso exclusivo para mi creador.' });
        }

        const estado = args[0]?.toLowerCase();
        const tipoActividad = args[1]?.toLowerCase();
        const texto = args.slice(2).join(' ');

        if (!estado || !['online', 'idle', 'dnd', 'invisible'].includes(estado)) {
            return message.reply({ 
                content: '⚠️ **Uso correcto:** `;setstatus <estado> <tipo> <texto>`\n**Estados:** `online`, `idle`, `dnd`, `invisible`\n**Tipos:** `watching`, `playing`, `listening`, `competing`, `streaming`\n**Ejemplo:** `;setstatus online streaming Mi Stream de Twitch`' 
            });
        }

        const tiposMap = {
            'watching': ActivityType.Watching,
            'playing': ActivityType.Playing,
            'listening': ActivityType.Listening,
            'competing': ActivityType.Competing,
            'streaming': ActivityType.Streaming
        };

        try {
            const actividadObj = {
                name: texto || 'CPU v2 Bot',
                type: tiposMap[tipoActividad] || ActivityType.Playing
            };

            if (tipoActividad === 'streaming') {
                actividadObj.url = 'https://www.twitch.tv/discord';
            }

            client.user.setPresence({
                status: estado,
                activities: texto ? [actividadObj] : []
            });

            return message.reply({ content: `✅ Presencia actualizada a estado **${estado.toUpperCase()}**${texto ? ` y actividad "${texto}"` : ''}.` });
        } catch (error) {
            console.error('Error al cambiar estado:', error);
            return message.reply({ content: '❌ Ocurrió un error al intentar cambiar la presencia.' });
        }
    }

    if (comando === 'ping') {
        const inicio = Date.now();
        const msg = await message.reply({ content: '🏓 Calculando...' });
        const latencia = Date.now() - inicio;
        return msg.edit({ content: `🏓 **Pong!**\n📡 Latencia: \`${latencia}ms\`\n💓 WebSocket: \`${client.ws.ping}ms\`` });
    }

    if (comando === 'help') {
        const listaComandos = {
            'Configuración Staff': [
                '`/staff perms` — Configura el rol de Staff del servidor'
            ],
            'Moderación (Slash y Prefijo)': [
                '`/kick` — Expulsa a un miembro',
                '`/ban` — Banea a un miembro',
                '`;softban` o `/softban` — Softban (expulsa y purga historial)',
                '`/unban` — Revoca un baneo',
                '`/mute` — Silencia temporalmente',
                '`/unmute` — Remueve el silencio',
                '`/warn` — Registra una advertencia',
                '`/warns view` — Consulta el historial de advertencias',
                '`/warns clear` — Limpia el historial de advertencias',
                '`/role add` — Asigna un rol',
                '`/role remove` — Remueve un rol',
                '`/clear` — Elimina mensajes masivamente'
            ],
            'Utilidad (Slash)': [
                '`/nick` — Cambia tu apodo o el de otro miembro',
                '`/userinfo` — Información de un miembro',
                '`/cmdcheck` — Verifica los permisos de un miembro',
                '`/postularse` — Inicia tu proceso de postulación',
                '`/set-canal-postulaciones` — Configura el canal de postulaciones',
                '`/send` — Envía un mensaje en el canal',
                '`/embed` — Envía un Embed formateado usando un cuadro de texto'
            ],
            'Generales (Prefijo ;)': [
                '`;ping` — Verifica la latencia del bot',
                '`;help` — Muestra este panel de comandos',
                '`;botinvite` — Obtén el enlace para invitar al bot',
                '`;serverinvite` — Recibe la invitación de este servidor por MD',
                '`;lock` — Bloquea el canal actual',
                '`;unlock` — Desbloquea el canal actual',
                '`;setstatus` — Cambia el estado del bot (Solo creador)'
            ]
        };

        const categorias = Object.keys(listaComandos);
        let pagina = 0;

        const construirEmbed = (i) => new EmbedBuilder()
            .setTitle('🖥️ Panel de Comandos')
            .setColor('#5865F2')
            .setThumbnail(client.user.displayAvatarURL())
            .addFields({ name: `📂 ${categorias[i]}`, value: listaComandos[categorias[i]].join('\n') })
            .setFooter({ text: `Página ${i + 1} de ${categorias.length} • CPU v2` })
            .setTimestamp();

        const construirBotones = (i) => new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('help_prev').setLabel('⬅️ Anterior').setStyle(ButtonStyle.Secondary).setDisabled(i === 0),
            new ButtonBuilder().setCustomId('help_next').setLabel('Siguiente ➡️').setStyle(ButtonStyle.Secondary).setDisabled(i === categorias.length - 1)
        );

        const helpMsg = await message.reply({ components: [embedToContainer(construirEmbed(pagina)), construirBotones(pagina)], flags: MessageFlags.IsComponentsV2 });
        const collector = helpMsg.createMessageComponentCollector({ time: 120000 });

        collector.on('collect', async i => {
            if (i.user.id !== message.author.id) {
                return i.reply({ content: '❌ Solo quien ejecutó el comando puede navegar este menú.', ephemeral: true });
            }
            if (i.customId === 'help_next') pagina++;
            if (i.customId === 'help_prev') pagina--;
            await i.update({ components: [embedToContainer(construirEmbed(pagina)), construirBotones(pagina)], flags: MessageFlags.IsComponentsV2 });
        });

        collector.on('end', async () => {
            try { await helpMsg.edit({ components: [embedToContainer(construirEmbed(pagina))], flags: MessageFlags.IsComponentsV2 }); } catch (e) { }
        });
        return;
    }

    if (comando === 'botinvite') {
        const inviteURL = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&permissions=${BOT_INVITE_PERMISSIONS}&scope=bot%20applications.commands`;
        const embed = new EmbedBuilder()
            .setTitle('🤖 Invitar a CPU v2')
            .setColor('#5865F2')
            .setThumbnail(client.user.displayAvatarURL())
            .addFields({ name: 'Enlace', value: `[Invitar Bot](${inviteURL})` })
            .setFooter({ text: 'CPU v2' })
            .setTimestamp();
        return message.reply({ components: [embedToContainer(embed)], flags: MessageFlags.IsComponentsV2 });
    }

    if (comando === 'serverinvite') {
        try {
            const invite = await message.channel.createInvite({ maxAge: 0, maxUses: 0, unique: false });
            const embed = new EmbedBuilder()
                .setTitle(`📨 Invitación — ${message.guild.name}`)
                .setColor('#57F287')
                .setThumbnail(message.guild.iconURL({ dynamic: true }))
                .addFields({ name: 'Enlace', value: invite.url })
                .setFooter({ text: 'CPU v2' })
                .setTimestamp();
            await message.author.send({ components: [embedToContainer(embed)], flags: MessageFlags.IsComponentsV2 });
            return message.reply({ content: '✅ Te envié la invitación del servidor por MD.' });
        } catch (error) {
            return message.reply({ content: '❌ No se pudo generar o enviar la invitación. Revisa que tenga el permiso "Crear Invitación" y que tus MD estén abiertos.' });
        }
    }

    if (comando === 'lock') {
        if (!esMiembroStaff(message.member, message.guild.id)) {
            return message.reply({ content: '❌ No se pudo bloquear el canal.' });
        }
        try {
            await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false });
            return message.channel.send({ content: '✅ Canal bloqueado.' });
        } catch (e) {
            return message.reply({ content: '❌ No se pudo bloquear el canal.' });
        }
    }

    if (comando === 'unlock') {
        if (!esMiembroStaff(message.member, message.guild.id)) {
            return message.reply({ content: '❌ No se pudo desbloquear el canal.' });
        }
        try {
            await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: null });
            return message.channel.send({ content: '✅ Canal desbloqueado.' });
        } catch (e) {
            return message.reply({ content: '❌ No se pudo desbloquear el canal.' });
        }
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    const { customId, guild, member, channel } = interaction;
    if (!guild) return;

    if (customId === 'abrir_ticket') {
        await interaction.deferReply({ ephemeral: true });

        const resultado = await crearTicket(guild, member, member.user);
        if (!resultado.ok) {
            return interaction.editReply({ content: resultado.motivo });
        }

        return interaction.editReply({ content: `✅ Tu ticket fue creado: <#${resultado.channel.id}>` });
    }

    if (customId === 'tomar_ticket') {
        if (!esMiembroStaff(member, guild.id)) {
            return interaction.reply({ content: '❌ No tienes permiso para tomar este ticket.', ephemeral: true });
        }

        const topic = channel.topic || '';
        const ownerId = topic.startsWith('ticket-owner:') ? topic.split(':')[1] : null;
        const ownerMember = ownerId ? await guild.members.fetch(ownerId).catch(() => null) : null;
        const nombreUsuario = ownerMember ? ownerMember.user.username : 'Usuario';

        try {
            const embedActualizado = construirEmbedTicket(nombreUsuario, member.user.username);
            const filaSoloCerrar = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('cerrar_ticket').setLabel('Cerrar Ticket').setEmoji('🔒').setStyle(ButtonStyle.Danger)
            );
            return interaction.update({ components: [embedToContainer(embedActualizado), filaSoloCerrar], flags: MessageFlags.IsComponentsV2 });
        } catch (e) {
            console.error('Error al tomar ticket:', e);
            return interaction.reply({ content: '❌ No pude actualizar el ticket.', ephemeral: true });
        }
    }

    if (customId === 'cerrar_ticket') {
        const topic = channel.topic || '';
        const ownerId = topic.startsWith('ticket-owner:') ? topic.split(':')[1] : null;
        const esDueño = ownerId === member.id;
        const esStaff = esMiembroStaff(member, guild.id);

        if (!esDueño && !esStaff) {
            return interaction.reply({ content: '❌ No tienes permiso para cerrar este ticket.', ephemeral: true });
        }

        await interaction.reply({ content: `🔒 Ticket cerrado por **${member.user.username}**. Este canal se eliminará en 5 segundos.` });
        setTimeout(() => {
            channel.delete().catch(() => {});
        }, 5000);
    }
});

client.login(TOKEN);
