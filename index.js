require('dotenv').config();
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
const path = require('path');
const express = require('express');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages
    ]
});

// CONFIGURACIÓN CENTRAL (ahora desde variables de entorno, nunca hardcodeadas)
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID; // opcional: si existe, registra comandos solo en ese server (instantáneo, ideal para beta)

if (!TOKEN || !CLIENT_ID) {
    console.error('❌ Faltan DISCORD_TOKEN o CLIENT_ID en tu archivo .env. Revisa .env.example');
    process.exit(1);
}

const ARCHIVO_WARNS = path.join(__dirname, 'warns.json');
const ARCHIVO_CONFIG = path.join(__dirname, 'config.json');

// Servidor Express para mantener el bot activo en Render 24/7
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('🤖 CPU v1.0 - El Cerebro Operativo de tu Servidor está Online.');
});

app.listen(PORT, () => {
    console.log(`🌐 [CPU v1.0] Servidor web de monitoreo activo en el puerto ${PORT}`);
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
        .setDescription('Consulta el historial de advertencias')
        .addUserOption(opt => opt.setName('usuario').setDescription('El miembro a consultar').setRequired(true)),

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
    console.log(`🚀 [CPU v1.0] Núcleo operativo inicializado y activo como ${client.user.tag}`);
    try {
        if (GUILD_ID) {
            await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
            console.log(`✅ [CPU v1.0] Comandos sincronizados al instante en el servidor de pruebas (${GUILD_ID}).`);
        } else {
            await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
            console.log('✅ [CPU v1.0] Comandos de barra sincronizados de forma global (puede tardar hasta 1 hora en verse).');
        }
    } catch (error) {
        console.error('❌ [CPU v1.0] Error crítico al sincronizar comandos:', error);
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
                .setTitle('👢 Registro de Expulsión')
                .setColor('#F2A30F')
                .setDescription(`Se ha ejecutado la salida forzada de **${usuario.user.username}**.`)
                .setThumbnail(usuario.user.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: '👤 Miembro Afectado', value: `${usuario.user.tag}\n\`ID: ${usuario.id}\``, inline: true },
                    { name: '🛡️ Moderador Responsable', value: `${user.tag}\n\`ID: ${user.id}\``, inline: true },
                    { name: '📝 Motivo de la Acción', value: `\`\`\`${razon}\`\`\``, inline: false }
                )
                .setFooter({ text: 'Sistema de Seguridad CPU v1.0 • Gestión de Servidores', iconURL: guild.iconURL() })
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
                .setTitle('🚨 Restricción de Acceso Permanente (Baneo)')
                .setColor('#ED4245')
                .setDescription(`El usuario **${usuario.user.username}** ha sido vetado de forma indefinida.`)
                .setThumbnail(usuario.user.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: '👤 Miembro Afectado', value: `${usuario.user.tag}\n\`ID: ${usuario.id}\``, inline: true },
                    { name: '🛡️ Moderador Responsable', value: `${user.tag}\n\`ID: ${user.id}\``, inline: true },
                    { name: '📝 Motivo de la Sanción', value: `\`\`\`${razon}\`\`\``, inline: false }
                )
                .setFooter({ text: 'Registro Central CPU v1.0 • Control de Seguridad', iconURL: guild.iconURL() })
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
                .setTitle('✅ Revocación de Veto')
                .setColor('#57F287')
                .setDescription(`Se han restablecido los derechos de ingreso de forma exitosa.`)
                .addFields(
                    { name: '🆔 Identificador Removido', value: `\`${userId}\``, inline: true },
                    { name: '🛡️ Autorizado por', value: `${user.tag}`, inline: true }
                )
                .setFooter({ text: 'Módulo de Gestión CPU v1.0' })
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
            .setTitle('🔊 Remoción de Mute')
            .setColor('#57F287')
            .setDescription(`Se ha desilenciado a **${usuario.user.tag}**.`)
            .addFields(
                { name: '👤 Miembro Restablecido', value: `${usuario.user.tag}`, inline: true },
                { name: '🛡️ Gestionado por', value: `${user.tag}`, inline: true }
            )
            .setFooter({ text: 'Módulo de Gestión CPU v1.0' })
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
                .setTitle('⚠️ Registro de Advertencia Formal')
                .setColor('#ED4245')
                .setDescription(`Se ha emitido un llamado de atención formal para **${usuario.user.username}**.`)
                .setThumbnail(usuario.user.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: '👤 Miembro Sancionado', value: `${usuario.user.tag}`, inline: true },
                    { name: '📊 Incidencias Acumuladas', value: `\`${totalWarns} Advertencia(s)\``, inline: true },
                    { name: '🛡️ Moderador Emisor', value: `${user.tag}`, inline: false },
                    { name: '📝 Causa del Reporte', value: `\`\`\`${razon}\`\`\``, inline: false }
                )
                .setFooter({ text: 'Historial de Conducta CPU v1.0' })
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error en /warn:', error);
            return interaction.reply({ content: '❌ Ocurrió un error al registrar la advertencia.', ephemeral: true });
        }
    }

    // COMANDO WARNS
    if (commandName === 'warns') {
        if (!usuario) return interaction.reply({ content: '❌ El objetivo especificado no se encuentra en el servidor.', ephemeral: true });
        let listaWarns = {};
        try {
            listaWarns = JSON.parse(fs.readFileSync(ARCHIVO_WARNS, 'utf8'));
        } catch (e) {
            listaWarns = {};
        }

        const usuarioWarns = listaWarns[usuario.id] || [];
        const embed = new EmbedBuilder()
            .setThumbnail(usuario.user.displayAvatarURL({ dynamic: true }))
            .setTimestamp();

        if (usuarioWarns.length === 0) {
            embed.setTitle(`📋 Registro de Historial de ${usuario.user.username}`)
                 .setColor('#57F287')
                 .setDescription(`✅ **Estado: Limpio.**\nEste usuario no cuenta con infracciones vigentes.`);
            return interaction.reply({ embeds: [embed] });
        }

        embed.setTitle(`📋 Expediente de Infracciones`)
             .setColor('#F2A30F')
             .setDescription(`Mostrando conductas archivadas para **${usuario.user.tag}**.\nTotal de registros: **${usuarioWarns.length}**\n─`);

        usuarioWarns.forEach((w, index) => {
            embed.addFields({
                name: `📁 Infracción #${index + 1} — Emitida el ${w.fecha}`,
                value: `**Supervisor:** \`${w.moderador}\`\n**Detalle:** *${w.razon}*`
            });
        });

        return interaction.reply({ embeds: [embed] });
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
                .setTitle('👤 Actualización de Apodo')
                .setColor('#57F287')
                .setDescription(nuevoApodo ? `Apodo actualizado a **${nuevoApodo}**.` : `Apodo restablecido.`)
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

    // COMANDO LOCK
    if (commandName === 'lock') {
        try {
            await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false });
            const embed = new EmbedBuilder()
                .setTitle('🔒 Canal Bloqueado')
                .setColor('#ED4245')
                .setDescription(`El canal <#${channel.id}> ha sido cerrado temporalmente por la administración.`)
                .addFields({ name: '🛡️ Moderador Responsable', value: `${user.tag}`, inline: true })
                .setFooter({ text: 'Sistema de Seguridad • CPU v1.0' })
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        } catch (e) {
            return interaction.reply({ content: '❌ Permisos insuficientes para bloquear el canal.', ephemeral: true });
        }
    }

    // COMANDO UNLOCK
    if (commandName === 'unlock') {
        try {
            await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: null });
            const embed = new EmbedBuilder()
                .setTitle('🔓 Canal Desbloqueado')
                .setColor('#57F287')
                .setDescription(`Se han restablecido los permisos de envío de mensajes en <#${channel.id}>.`)
                .addFields({ name: '🛡️ Moderador Responsable', value: `${user.tag}`, inline: true })
                .setFooter({ text: 'Sistema de Seguridad • CPU v1.0' })
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        } catch (e) {
            return interaction.reply({ content: '❌ Permisos insuficientes para desbloquear el canal.', ephemeral: true });
        }
    }

    // COMANDO SET-CANAL-POSTULACIONES
    if (commandName === 'set-canal-postulaciones') {
        const canalTexto = options.getChannel('canal');
        const config = obtenerConfig();
        config[guild.id] = canalTexto.id;
        guardarConfig(config);

        const embed = new EmbedBuilder()
            .setTitle('⚙️ Configuración del Canal de Postulaciones')
            .setColor('#57F287')
            .setDescription(`Se ha vinculado el canal <#${canalTexto.id}> para recibir los expedientes enviados por **CPU v1.0**.`)
            .setFooter({ text: 'Sistema de Reclutamiento • CPU v1.0' })
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
            .setTitle(`📜 Postulación al Equipo de Staff — ${guild.name}`)
            .setColor('#57F287')
            .setDescription(`¡Hola, **${user.username}**!\n\nBienvenido al proceso oficial de postulación para **${guild.name}**.\n\nPresiona **Aceptar** para iniciar o **Rechazar** para cancelar.`)
            .setThumbnail(guild.iconURL({ dynamic: true }))
            .setFooter({ text: 'Sistema Central CPU v1.0 • Módulo de Selección' })
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

                    const preguntas = [
                        '1️⃣ ¿Qué edad tienes y cuál es tu país de residencia?',
                        '2️⃣ ¿Tienes experiencia previa como Moderador o Staff?',
                        '3️⃣ ¿Cuántas horas diarias podrías dedicar al servidor?',
                        '4️⃣ ¿Cómo reaccionarías si presencias una discusión subida de tono?'
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
                            .setTitle('📥 Nueva Postulación de Candidato')
                            .setColor('#FEE75C')
                            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                            .setDescription(`Expediente recibido de **${user.tag}** (\`ID: ${user.id}\`).`)
                            .addFields(
                                { name: preguntas[0], value: respuestas[0] },
                                { name: preguntas[1], value: respuestas[1] },
                                { name: preguntas[2], value: respuestas[2] },
                                { name: preguntas[3], value: respuestas[3] }
                            )
                            .setFooter({ text: 'Sistema de Reclutamiento • CPU v1.0' })
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

client.login(TOKEN);
