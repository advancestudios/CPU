const { 
    Client, 
    GatewayIntentBits, 
    REST, 
    Routes, 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ChannelType 
} = require('discord.js');
const fs = require('fs');
const path = path = require('path');
const express = require('express');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ]
});

// CONFIGURACIÓN CENTRAL
const TOKEN = 'MTUxOTAyMzUxMDk4MTE4NTc5Ng.GMl5Qk.5UH5rPOusVjYQgRJ6zK8MMAfU6ZPgDSXJcHB1c';
const CLIENT_ID = '1519023510981185796'; 
const PREFIX = ';';
const ARCHIVO_WARNS = path.join(__dirname, 'warns.json');
const ARCHIVO_CONFIG = path.join(__dirname, 'config.json');

// Servidor Express
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('🤖 CPU v1.0 Online'));
app.listen(PORT, () => console.log(`🌐 [CPU v1.0] Servidor web activo en puerto ${PORT}`));

// Archivos de datos
if (!fs.existsSync(ARCHIVO_WARNS)) fs.writeFileSync(ARCHIVO_WARNS, JSON.stringify({}), 'utf8');
if (!fs.existsSync(ARCHIVO_CONFIG)) fs.writeFileSync(ARCHIVO_CONFIG, JSON.stringify({}), 'utf8');

function obtenerConfig() {
    try { return JSON.parse(fs.readFileSync(ARCHIVO_CONFIG, 'utf8')); } catch { return {}; }
}
function guardarConfig(data) {
    fs.writeFileSync(ARCHIVO_CONFIG, JSON.stringify(data, null, 2), 'utf8');
}

// ==========================================
// 🛠️ FUNCIONES MULTIFUNCIONALES REUTILIZABLES
// ==========================================

async function ejecutarLock(canal, usuarioEmisor, responder) {
    try {
        await canal.permissionOverwrites.edit(canal.guild.roles.everyone, { SendMessages: false });
        const embed = new EmbedBuilder()
            .setTitle('🔒 Canal Bloqueado')
            .setColor('#ED4245')
            .setDescription(`El canal <#${canal.id}> ha sido cerrado temporalmente.`)
            .addFields({ name: '🛡️ Moderador Responsable', value: `${usuarioEmisor.tag}`, inline: true })
            .setFooter({ text: 'Sistema de Seguridad • CPU v1.0' })
            .setTimestamp();

        return responder({ embeds: [embed] });
    } catch (e) {
        return responder({ content: '❌ Permisos insuficientes para bloquear el canal.', ephemeral: true });
    }
}

async function ejecutarUnlock(canal, usuarioEmisor, responder) {
    try {
        await canal.permissionOverwrites.edit(canal.guild.roles.everyone, { SendMessages: null });
        const embed = new EmbedBuilder()
            .setTitle('🔓 Canal Desbloqueado')
            .setColor('#57F287')
            .setDescription(`Se han restablecido los permisos de envío de mensajes en <#${canal.id}>.`)
            .addFields({ name: '🛡️ Moderador Responsable', value: `${usuarioEmisor.tag}`, inline: true })
            .setFooter({ text: 'Sistema de Seguridad • CPU v1.0' })
            .setTimestamp();

        return responder({ embeds: [embed] });
    } catch (e) {
        return responder({ content: '❌ Permisos insuficientes para desbloquear el canal.', ephemeral: true });
    }
}

// ==========================================
// 1. REGISTRO REDISEÑADO DE SLASH COMMANDS
// ==========================================
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
        .setDescription('Consulta el historial de advertencias')
        .addUserOption(opt => opt.setName('usuario').setDescription('El miembro a consultar').setRequired(true)),

    // Subcomandos de Role
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

    // Comando Universal de Nick
    new SlashCommandBuilder()
        .setName('nick')
        .setDescription('Modifica tu apodo o el de otro miembro')
        .addStringOption(opt => opt.setName('apodo').setDescription('Nuevo apodo (vacío para restablecer)').setRequired(false))
        .addUserOption(opt => opt.setName('usuario').setDescription('Miembro a modificar (Solo Administradores)').setRequired(false)),

    new SlashCommandBuilder()
        .setName('lock')
        .setDescription('Bloquea el canal actual')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    new SlashCommandBuilder()
        .setName('unlock')
        .setDescription('Desbloquea el canal actual')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

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
    console.log(`🚀 [CPU v1.0] Núcleo activo como ${client.user.tag}`);
    try {
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
        console.log('✅ [CPU v1.0] Comandos rediseñados y sincronizados globales.');
    } catch (err) {
        console.error('❌ Error al sincronizar comandos:', err);
    }
});

// ==========================================
// 2. MANEJADOR DE COMANDOS POR PREFIX (;)
// ==========================================
client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild || !message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    const responder = (opciones) => message.channel.send(opciones);

    if (command === 'lock') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) return message.reply('❌ Permisos insuficientes.');
        return ejecutarLock(message.channel, message.author, responder);
    }

    if (command === 'unlock') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) return message.reply('❌ Permisos insuficientes.');
        return ejecutarUnlock(message.channel, message.author, responder);
    }
});

// ==========================================
// 3. MANEJADOR DE INTERACCIONES SLASH (/)
// ==========================================
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, options, guild, user, channel } = interaction;
    const usuario = options.getMember('usuario');
    const razon = options.getString('razon') || 'Ninguna especificada.';

    // MUTE (Antes Timeout)
    if (commandName === 'mute') {
        const minutes = options.getInteger('minutos');
        if (!usuario.moderatable) return interaction.reply({ content: '❌ Impresionante: El miembro posee rango superior o inmunidad.', ephemeral: true });
        
        await usuario.timeout(minutes * 60 * 1000, razon);

        const embed = new EmbedBuilder()
            .setTitle('⏳ Restricción Temporal (Mute)')
            .setColor('#FEE75C')
            .setDescription(`Se ha silenciado temporalmente a **${usuario.user.username}**.`)
            .setThumbnail(usuario.user.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: '👤 Miembro Afectado', value: `${usuario.user.tag}`, inline: true },
                { name: '⏱️ Duración', value: `\`${minutes} minutos\``, inline: true },
                { name: '🛡️ Aplicado por', value: `${user.tag}`, inline: false },
                { name: '📝 Motivo', value: `\`\`\`${razon}\`\`\``, inline: false }
            )
            .setFooter({ text: 'Sistema de Seguridad • CPU v1.0' })
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }

    // UNMUTE (Antes Untimeout)
    if (commandName === 'unmute') {
        if (!usuario.moderatable) return interaction.reply({ content: '❌ No poseo autoridad para modificar a este miembro.', ephemeral: true });
        if (!usuario.communicationDisabledUntilTimestamp) return interaction.reply({ content: 'ℹ️ El miembro no está silenciado.', ephemeral: true });

        await usuario.timeout(null);

        const embed = new EmbedBuilder()
            .setTitle('🔊 Remoción de Mute')
            .setColor('#57F287')
            .setDescription(`Se ha desilenciado a **${usuario.user.tag}**.`)
            .addFields(
                { name: '👤 Miembro Restablecido', value: `${usuario.user.tag}`, inline: true },
                { name: '🛡️ Gestionado por', value: `${user.tag}`, inline: true }
            )
            .setFooter({ text: 'Módulo de Gestión • CPU v1.0' })
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }

    // ROLES (ROLE ADD / ROLE REMOVE)
    if (commandName === 'role') {
        const sub = options.getSubcommand();
        const rol = options.getRole('rol');

        if (rol.position >= guild.members.me.roles.highest.position) {
            return interaction.reply({ content: '❌ El rol supera la jerarquía del bot.', ephemeral: true });
        }

        if (sub === 'add') {
            if (usuario.roles.cache.has(rol.id)) return interaction.reply({ content: `ℹ️ El miembro ya tiene el rol **${rol.name}**.`, ephemeral: true });
            await usuario.roles.add(rol);

            const embed = new EmbedBuilder()
                .setTitle('💼 Role Add — Permisos Otorgados')
                .setColor('#57F287')
                .addFields(
                    { name: '👤 Receptor', value: `${usuario.user.tag}`, inline: true },
                    { name: '🛡️ Rol Otorgado', value: `<@&${rol.id}>`, inline: true },
                    { name: '✍️ Autorizado por', value: `${user.tag}`, inline: false }
                )
                .setFooter({ text: 'Gestión de Permisos • CPU v1.0' })
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'remove') {
            if (!usuario.roles.cache.has(rol.id)) return interaction.reply({ content: `ℹ️ El miembro no cuenta con el rol **${rol.name}**.`, ephemeral: true });
            await usuario.roles.remove(rol);

            const embed = new EmbedBuilder()
                .setTitle('💼 Role Remove — Permisos Revocados')
                .setColor('#ED4245')
                .addFields(
                    { name: '👤 Afectado', value: `${usuario.user.tag}`, inline: true },
                    { name: '🛡️ Rol Retirado', value: `<@&${rol.id}>`, inline: true },
                    { name: '✍️ Modificado por', value: `${user.tag}`, inline: false }
                )
                .setFooter({ text: 'Gestión de Permisos • CPU v1.0' })
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        }
    }

    // COMANDO NICK UNIVERSAL
    if (commandName === 'nick') {
        const nuevoApodo = options.getString('apodo') || null;
        const miembroObjetivo = options.getMember('usuario') || interaction.member;

        // Si intenta cambiar el nick de otra persona
        if (miembroObjetivo.id !== user.id) {
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageNicknames)) {
                return interaction.reply({ content: '❌ Requieres el permiso de `Gestionar Apodos` para cambiar el apodo de otro miembro.', ephemeral: true });
            }
            if (guild.ownerId === miembroObjetivo.id) {
                return interaction.reply({ content: '❌ Prohibido modificar credenciales del propietario del servidor.', ephemeral: true });
            }
            if (miembroObjetivo.roles.highest.position >= guild.members.me.roles.highest.position) {
                return interaction.reply({ content: '❌ Jerarquía insuficiente para alterar a este miembro.', ephemeral: true });
            }
        } else {
            if (guild.ownerId === user.id) {
                return interaction.reply({ content: '❌ Discord no permite alterar el nick del dueño del servidor vía bot.', ephemeral: true });
            }
        }

        try {
            await miembroObjetivo.setNickname(nuevoApodo);

            const embed = new EmbedBuilder()
                .setTitle('👤 Actualización de Apodo')
                .setColor('#57F287')
                .setDescription(nuevoApodo ? `Apodo modificado a **${nuevoApodo}**.` : `Apodo restablecido.`)
                .addFields(
                    { name: '👤 Usuario', value: `${miembroObjetivo.user.tag}`, inline: true },
                    { name: '🛡️ Ejecutado por', value: `${user.tag}`, inline: true }
                )
                .setFooter({ text: 'Registro de Identidades • CPU v1.0' })
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        } catch (error) {
            return interaction.reply({ content: '❌ Error al modificar el apodo.', ephemeral: true });
        }
    }

    // KICK, BAN, UNBAN, WARN, WARNS, CLEAR, LOCK, UNLOCK, POSTULARSE SE MANTIENEN VIGENTES
    if (commandName === 'lock') return ejecutarLock(channel, user, (opts) => interaction.reply(opts));
    if (commandName === 'unlock') return ejecutarUnlock(channel, user, (opts) => interaction.reply(opts));
});

client.login(TOKEN);
