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
    ChannelType 
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const express = require('express');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent // necesario para leer comandos con prefijo ";"
    ]
});

const PREFIX = ';';

// CONFIGURACIÓN CENTRAL (ahora desde variables de entorno, nunca hardcodeadas)
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

if (!TOKEN || !CLIENT_ID) {
    console.error('❌ Faltan DISCORD_TOKEN o CLIENT_ID en tu archivo .env. Revisa .env.example');
    process.exit(1);
}

const ARCHIVO_WARNS = path.join(__dirname, 'warns.json');
const ARCHIVO_CONFIG = path.join(__dirname, 'config.json');

// Permisos que se solicitan al invitar el bot a un nuevo servidor (usado en ;botinvite)
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

// Servidor Express para mantener el bot activo en Render 24/7
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('🤖 CPU v2 - El Cerebro Operativo de tu Servidor está Online.');
});

app.listen(PORT, () => {
    console.log(`🌐 [CPU v2] Servidor web de monitoreo activo en el puerto ${PORT}`);
});

// Archivos de datos locales
if (!fs.existsSync(ARCHIVO_WARNS)) fs.writeFileSync(ARCHIVO_WARNS, JSON.stringify({}), 'utf8');
if (!fs.existsSync(ARCHIVO_CONFIG)) fs.writeFileSync(ARCHIVO_CONFIG, JSON.stringify({}), 'utf8');

function obtenerConfig() {
    try { return JSON.parse(fs.readFileSync(ARCHIVO_CONFIG, 'utf8')); } catch { return {}; }
}
function guardarConfig(data) {
    fs.writeFileSync(ARCHIVO_CONFIG, JSON.stringify(data, null, 2), 'utf8');
}

// 1. REGISTRO Y DEFINICIÓN COMPLETA DE COMANDOS DE BARRA (SLASH COMMANDS)
const commands = [
    new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Expulsa a un miembro del servidor')
        .addUserOption(opt => opt.setName('usuario').setDescription('El miembro a expulsar').setRequired(true))
        .addStringOption(opt => opt.setName('razon').setDescription('Motivo detallado'))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

    new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Banea permanentemente a un miembro')
        .addUserOption(opt => opt.setName('usuario').setDescription('El miembro a banear').setRequired(true))
        .addStringOption(opt => opt.setName('razon').setDescription('Motivo detallado'))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Revoca el baneo de un usuario mediante su ID')
        .addStringOption(opt => opt.setName('id').setDescription('ID de Discord del usuario').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

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
        .addStringOption(opt => opt.setName('razon').setDescription('Motivo detallado'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    new SlashCommandBuilder()
        .setName('unmute')
        .setDescription('Remueve el aislamiento/silencio de un miembro')
        .addUserOption(opt => opt.setName('usuario').setDescription('El miembro a restablecer').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Registra una advertencia formal')
        .addUserOption(opt => opt.setName('usuario').setDescription('El miembro a advertir').setRequired(true))
        .addStringOption(opt => opt.setName('razon').setDescription('Motivo'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

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
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

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
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

    new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Limpia mensajes masivamente')
        .addIntegerOption(opt => opt.setName('cantidad').setDescription('Cantidad (1-100)').setRequired(true).setMinValue(1).setMaxValue(100))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

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

].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

client.once('ready', async () => {
    console.log(`🚀 [CPU v2] Núcleo operativo inicializado y activo como ${client.user.tag}`);
    try {
        if (GUILD_ID) {
            await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
            console.log(`✅ [CPU v2] Comandos sincronizados al instante en el servidor de pruebas (${GUILD_ID}).`);
        } else {
            await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
            console.log('✅ [CPU v2] Comandos de barra sincronizados de forma global (puede tardar hasta 1 hora en verse).');
        }
    } catch (error) {
        console.error('❌ [CPU v2] Error crítico al sincronizar comandos:', error);
    }
});

// 2. ORQUESTADOR DE INTERACCIONES (SLASH COMMANDS EXCLUSIVAMENTE)
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, options, guild, user, channel } = interaction;
    const usuario = options.getMember('usuario');
    const razon = options.getString('razon') || 'Ninguna especificada.';

    // COMANDO KICK
    if (commandName === 'kick') {
        if (!usuario) return interaction.reply({ content: '❌ El objetivo especificado no se encuentra en el servidor.', ephemeral: true });
        if (!usuario.kickable) return interaction.reply({ content: '❌ Operación denegada: Privilegios insuficientes o jerarquía superior.', ephemeral: true });

        try {
            await usuario.kick(razon);

            const embed = new EmbedBuilder()
                .setTitle('👢 Miembro Expulsado')
                .setColor('#F2A30F')
                .setThumbnail(usuario.user.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: 'Miembro', value: `${usuario.user.username}`, inline: true },
                    { name: 'Moderador', value: `${user.username}`, inline: true },
                    { name: 'Razón', value: razon, inline: false }
                )
                .setFooter({ text: 'CPU v2' })
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error en /kick:', error);
            return interaction.reply({ content: '❌ Ocurrió un error al intentar expulsar al miembro.', ephemeral: true });
        }
    }

    // COMANDO BAN
    if (commandName === 'ban') {
        if (!usuario) return interaction.reply({ content: '❌ El objetivo especificado no se encuentra en el servidor.', ephemeral: true });
        if (!usuario.bannable) return interaction.reply({ content: '❌ Operación denegada: El miembro posee inmunidad o un rol superior.', ephemeral: true });

        try {
            await guild.members.ban(usuario.id, { reason: razon });

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

            return interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error en /ban:', error);
            return interaction.reply({ content: '❌ Ocurrió un error al intentar banear al miembro.', ephemeral: true });
        }
    }

    // COMANDO UNBAN
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

            return interaction.reply({ embeds: [embed] });
        } catch (error) {
            return interaction.reply({ content: '❌ Error: La ID provista no coincide con ningún baneo activo.', ephemeral: true });
        }
    }

    // COMANDO MUTE
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

            return interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error en /mute:', error);
            return interaction.reply({ content: '❌ Ocurrió un error al intentar silenciar al miembro.', ephemeral: true });
        }
    }

    // COMANDO UNMUTE
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

        return interaction.reply({ embeds: [embed] });
    }

    // COMANDO WARN
    if (commandName === 'warn') {
        if (!usuario) return interaction.reply({ content: '❌ El objetivo especificado no se encuentra en el servidor.', ephemeral: true });
        if (usuario.user.bot) return interaction.reply({ content: '❌ Los perfiles automatizados (bots) no pueden recibir amonestaciones.', ephemeral: true });

        try {
            let listaWarns = {};
            try {
                listaWarns = JSON.parse(fs.readFileSync(ARCHIVO_WARNS, 'utf8'));
            } catch (e) {
                listaWarns = {};
            }

            if (!listaWarns[usuario.id]) listaWarns[usuario.id] = [];

            listaWarns[usuario.id].push({
                moderador: user.tag,
                razon: razon,
                fecha: new Date().toLocaleDateString()
            });

            fs.writeFileSync(ARCHIVO_WARNS, JSON.stringify(listaWarns, null, 2), 'utf8');
            const totalWarns = listaWarns[usuario.id].length;

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

            return interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error en /warn:', error);
            return interaction.reply({ content: '❌ Ocurrió un error al registrar la advertencia.', ephemeral: true });
        }
    }

    // SUBCOMANDOS WARNS (WARNS VIEW / WARNS CLEAR)
    if (commandName === 'warns') {
        if (!usuario) return interaction.reply({ content: '❌ El objetivo especificado no se encuentra en el servidor.', ephemeral: true });
        const sub = options.getSubcommand();

        let listaWarns = {};
        try {
            listaWarns = JSON.parse(fs.readFileSync(ARCHIVO_WARNS, 'utf8'));
        } catch (e) {
            listaWarns = {};
        }

        if (sub === 'view') {
            const usuarioWarns = listaWarns[usuario.id] || [];
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
                return interaction.reply({ embeds: [embed] });
            }

            embed.setTitle('📋 Historial de Advertencias')
                 .setColor('#F2A30F')
                 .addFields(
                    { name: 'Miembro', value: `${usuario.user.username}`, inline: true },
                    { name: 'Total', value: `${usuarioWarns.length}`, inline: true }
                 );

            usuarioWarns.forEach((w, index) => {
                embed.addFields({
                    name: `#${index + 1} — ${w.fecha}`,
                    value: `Mod: ${w.moderador} • Razón: ${w.razon}`
                });
            });

            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'clear') {
            if (!listaWarns[usuario.id] || listaWarns[usuario.id].length === 0) {
                return interaction.reply({ content: `ℹ️ **${usuario.user.username}** ya no tiene advertencias registradas.`, ephemeral: true });
            }

            delete listaWarns[usuario.id];
            fs.writeFileSync(ARCHIVO_WARNS, JSON.stringify(listaWarns, null, 2), 'utf8');

            const embed = new EmbedBuilder()
                .setTitle('🧹 Historial Limpiado')
                .setColor('#57F287')
                .addFields(
                    { name: 'Miembro', value: `${usuario.user.username}`, inline: true },
                    { name: 'Moderador', value: `${user.username}`, inline: true }
                )
                .setFooter({ text: 'CPU v2' })
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        }
    }

    // SUBCOMANDOS ROLE (ROLE ADD / ROLE REMOVE)
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

            return interaction.reply({ embeds: [embed] });
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

            return interaction.reply({ embeds: [embed] });
        }
    }

    // COMANDO CLEAR
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

    // COMANDO NICK UNIVERSAL
    if (commandName === 'nick') {
        const nuevoApodo = options.getString('apodo') || null;
        const miembroObjetivo = options.getMember('usuario') || interaction.member;

        if (miembroObjetivo.id !== user.id) {
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageNicknames)) {
                return interaction.reply({ content: '❌ Requieres el permiso de `Gestionar Apodos` para modificar el alias de otro usuario.', ephemeral: true });
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

            return interaction.reply({ embeds: [embed] });
        } catch (error) {
            return interaction.reply({ content: '❌ Error al modificar el apodo.', ephemeral: true });
        }
    }

    // COMANDO USERINFO
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

        return interaction.reply({ embeds: [embed] });
    }

    // COMANDO CMDCHECK (VERIFICADOR DE PERMISOS)
    if (commandName === 'cmdcheck') {
        const miembro = options.getMember('usuario') || interaction.member;

        // Mapa de permisos técnicos -> nombre legible en español
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

        return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // COMANDO SET-CANAL-POSTULACIONES
    if (commandName === 'set-canal-postulaciones') {
        const canalTexto = options.getChannel('canal');
        const config = obtenerConfig();
        config[guild.id] = canalTexto.id;
        guardarConfig(config);

        const embed = new EmbedBuilder()
            .setTitle('⚙️ Canal Configurado')
            .setColor('#57F287')
            .addFields({ name: 'Canal de Postulaciones', value: `<#${canalTexto.id}>` })
            .setFooter({ text: 'CPU v2' })
            .setTimestamp();

        return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // COMANDO POSTULARSE
    if (commandName === 'postularse') {
        const config = obtenerConfig();
        const canalId = config[guild.id];

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
            const mensajeDM = await user.send({ embeds: [embedMD], components: [row] });
            await interaction.reply({ content: '📬 Te hemos enviado un MD para comenzar tu postulación.', ephemeral: true });

            const collector = mensajeDM.createMessageComponentCollector({ time: 60000 });
            let respondido = false;

            collector.on('collect', async i => {
                respondido = true;
                if (i.customId === 'cancelar_postulacion') {
                    await i.update({ content: '❌ Has cancelado la postulación.', embeds: [], components: [] });
                    return;
                }

                if (i.customId === 'iniciar_postulacion') {
                    await i.update({ content: '📝 **Proceso Iniciado.** Responde a las siguientes preguntas directamente por este chat.', embeds: [], components: [] });

                    // ================================================
                    // 📋 PREGUNTAS DE POSTULACIÓN — EDITA AQUÍ
                    // Agrega, quita o cambia el texto de cada pregunta.
                    // El bot las envía en el mismo orden en que aparecen.
                    // ================================================
                    const preguntas = [
                        '1️⃣ ¿Qué edad tienes y cuál es tu país de residencia?',
                        '2️⃣ ¿Tienes experiencia previa como Moderador o Staff?',
                        '3️⃣ ¿Cuántas horas diarias podrías dedicar al servidor?',
                        '4️⃣ ¿Cómo reaccionarías si presencias una discusión subida de tono?'
                    ];
                    // ================================================
                    // FIN PREGUNTAS DE POSTULACIÓN
                    // ================================================

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

                        await canalDestino.send({ embeds: [embedExpediente] });
                        await dmChannel.send('✅ **¡Postulación enviada con éxito!** Tus respuestas han sido entregadas.');
                    } else {
                        await dmChannel.send('⚠️ Hubo un error al entregar el expediente. Contacta a un administrador.');
                    }
                }
            });

            collector.on('end', async () => {
                if (!respondido) {
                    try {
                        await mensajeDM.edit({ content: '⏳ El tiempo para responder expiró. Usa `/postularse` de nuevo si deseas continuar.', embeds: [], components: [] });
                    } catch (e) { /* el MD pudo haber sido borrado por el usuario, se ignora */ }
                }
            });

        } catch (error) {
            return interaction.reply({ content: '❌ No pude enviarte un mensaje privado. Revisa tus ajustes de privacidad.', ephemeral: true });
        }
    }
});

// 3. COMANDOS CON PREFIJO PERSONALIZADO ";" (SOLO LOCK Y UNLOCK)
client.on('messageCreate', async message => {
    if (message.author.bot) return;
    if (!message.guild) return; // ignorar DMs
    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
    const comando = args.shift().toLowerCase();

    if (comando === 'ping') {
        const inicio = Date.now();
        const msg = await message.reply({ content: '🏓 Calculando...' });
        const latencia = Date.now() - inicio;
        return msg.edit({ content: `🏓 **Pong!**\n📡 Latencia: \`${latencia}ms\`\n💓 WebSocket: \`${client.ws.ping}ms\`` });
    }

    if (comando === 'help') {
        // ================================================
        // 📖 LISTA DE COMANDOS — EDITA AQUÍ
        // Cada clave es el nombre de la categoría/página.
        // ================================================
        const listaComandos = {
            'Moderación (Slash)': [
                '`/kick` — Expulsa a un miembro',
                '`/ban` — Banea a un miembro',
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
                '`/set-canal-postulaciones` — Configura el canal de postulaciones'
            ],
            'Generales (Prefijo ;)': [
                '`;ping` — Verifica la latencia del bot',
                '`;help` — Muestra este panel de comandos',
                '`;botinvite` — Obtén el enlace para invitar al bot',
                '`;serverinvite` — Recibe la invitación de este servidor por MD',
                '`;lock` — Bloquea el canal actual',
                '`;unlock` — Desbloquea el canal actual'
            ]
        };
        // ================================================
        // FIN LISTA DE COMANDOS
        // ================================================

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

        const helpMsg = await message.reply({ embeds: [construirEmbed(pagina)], components: [construirBotones(pagina)] });
        const collector = helpMsg.createMessageComponentCollector({ time: 120000 });

        collector.on('collect', async i => {
            if (i.user.id !== message.author.id) {
                return i.reply({ content: '❌ Solo quien ejecutó el comando puede navegar este menú.', ephemeral: true });
            }
            if (i.customId === 'help_next') pagina++;
            if (i.customId === 'help_prev') pagina--;
            await i.update({ embeds: [construirEmbed(pagina)], components: [construirBotones(pagina)] });
        });

        collector.on('end', async () => {
            try { await helpMsg.edit({ components: [] }); } catch (e) { /* el mensaje pudo haber sido borrado */ }
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
        return message.reply({ embeds: [embed] });
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
            await message.author.send({ embeds: [embed] });
            return message.reply({ content: '✅ Te envié la invitación del servidor por MD.' });
        } catch (error) {
            return message.reply({ content: '❌ No se pudo generar o enviar la invitación. Revisa que tenga el permiso "Crear Invitación" y que tus MD estén abiertos.' });
        }
    }

    if (comando === 'lock') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
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
        if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
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

client.login(TOKEN);
