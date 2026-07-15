const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const express = require('express');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages
    ]
});

// CONFIGURACIÓN (Mantenemos tu mismo token)
const TOKEN = 'MTUxOTAyMzUxMDk4MTE4NTc5Ng.GMl5Qk.5UH5rPOusVjYQgRJ6zK8MMAfU6ZPgDSXJcHB1c';
const CLIENT_ID = '1519023510981185796'; 
const ARCHIVO_WARNS = path.join(__dirname, 'warns.json');

// Servidor Express para Render (Mantiene el bot activo 24/7)
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('🤖 Sistema Centralizado de Moderación - Activo');
});

app.listen(PORT, () => {
    console.log(`🌐 Servidor de monitoreo web activo en el puerto ${PORT}`);
});

// Crear almacenamiento local para advertencias si no existe
if (!fs.existsSync(ARCHIVO_WARNS)) {
    fs.writeFileSync(ARCHIVO_WARNS, JSON.stringify({}), 'utf8');
}

// 1. Registro y Definición de Comandos de Barra
const commands = [
    new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Expulsa a un miembro del servidor')
        .addUserOption(option => option.setName('usuario').setDescription('El miembro a expulsar').setRequired(true))
        .addStringOption(option => option.setName('razon').setDescription('Motivo detallado de la expulsión'))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

    new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Banea permanentemente a un miembro del servidor')
        .addUserOption(option => option.setName('usuario').setDescription('El miembro a banear').setRequired(true))
        .addStringOption(option => option.setName('razon').setDescription('Motivo detallado del baneo'))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Revoca el baneo de un usuario mediante su ID')
        .addStringOption(option => option.setName('id').setDescription('ID numérica de Discord del usuario').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('Aísla temporalmente a un miembro restringiendo sus interacciones')
        .addUserOption(option => option.setName('usuario').setDescription('El miembro a aislar').setRequired(true))
        .addIntegerOption(option => 
            option.setName('minutos')
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
        .addStringOption(option => option.setName('razon').setDescription('Motivo detallado del aislamiento'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    new SlashCommandBuilder()
        .setName('untimeout')
        .setDescription('Remueve prematuramente el aislamiento temporal de un miembro')
        .addUserOption(option => option.setName('usuario').setDescription('El miembro a restablecer').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Registra una advertencia formal en el historial de un miembro')
        .addUserOption(option => option.setName('usuario').setDescription('El miembro a advertir').setRequired(true))
        .addStringOption(option => option.setName('razon').setDescription('Motivo de la advertencia formal'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    new SlashCommandBuilder()
        .setName('warns')
        .setDescription('Consulta el historial completo de advertencias de un miembro')
        .addUserOption(option => option.setName('usuario').setDescription('El miembro a consultar').setRequired(true)),

    new SlashCommandBuilder()
        .setName('dar-rol')
        .setDescription('Asigna un rol jerárquico a un miembro')
        .addUserOption(option => option.setName('usuario').setDescription('El miembro receptor').setRequired(true))
        .addRoleOption(option => option.setName('rol').setDescription('El rol que se va a asignar').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

    new SlashCommandBuilder()
        .setName('quitar-rol')
        .setDescription('Remueve un rol jerárquico de un miembro')
        .addUserOption(option => option.setName('usuario').setDescription('El miembro afectado').setRequired(true))
        .addRoleOption(option => option.setName('rol').setDescription('El rol que se va a remover').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

    new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Limpia de forma masiva una cantidad de mensajes recientes en el canal')
        .addIntegerOption(option => 
            option.setName('cantidad')
                .setDescription('Número de mensajes a eliminar (1-100)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    new SlashCommandBuilder()
        .setName('nick')
        .setDescription('Modifica tu propio apodo dentro del servidor')
        .addStringOption(option => option.setName('apodo').setDescription('Nuevo apodo (deja vacío para restablecer)').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ChangeNickname),

    new SlashCommandBuilder()
        .setName('set-nick')
        .setDescription('Modifica administrativamente el apodo de otro miembro')
        .addUserOption(option => option.setName('usuario').setDescription('El miembro a modificar').setRequired(true))
        .addStringOption(option => option.setName('apodo').setDescription('Nuevo apodo (deja vacío para restablecer)').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames),

].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

client.once('ready', async () => {
    console.log(`🚀 Control de Operaciones activo como ${client.user.tag}`);
    try {
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
        console.log('✅ Base de comandos globales sincronizada correctamente.');
    } catch (error) {
        console.error('❌ Error crítico en la sincronización de comandos:', error);
    }
});

// 2. Orquestador de Interacciones y Respuestas Ejecutivas
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, options, guild, user, channel } = interaction;
    const usuario = options.getMember('usuario');
    const razon = options.getString('razon') || 'Ninguna especificada por el moderador.';

    // Validación unificada de existencia del objetivo
    if (!usuario && ['kick', 'ban', 'timeout', 'untimeout', 'warn', 'warns', 'dar-rol', 'quitar-rol', 'set-nick'].includes(commandName)) {
        return interaction.reply({ content: '❌ El objetivo especificado no se encuentra en el servidor actual.', ephemeral: true });
    }

    // COMANDO KICK
    if (commandName === 'kick') {
        if (!usuario.kickable) return interaction.reply({ content: '❌ Operación denegada: Privilegios insuficientes o jerarquía superior.', ephemeral: true });
        await usuario.kick(razon);

        const embed = new EmbedBuilder()
            .setTitle('👢 Registro de Expulsión')
            .setColor('#F2A30F')
            .setDescription(`Se ha ejecutado la salida forzada del miembro **${usuario.user.username}** del servidor.`)
            .setThumbnail(usuario.user.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: '👤 Miembro Afectado', value: `${usuario.user.tag}\n\`ID: ${usuario.id}\``, inline: true },
                { name: '🛡️ Moderador Responsable', value: `${user.tag}\n\`ID: ${user.id}\``, inline: true },
                { name: '📝 Motivo de la Acción', value: `\`\`\`${razon}\`\`\``, inline: false }
            )
            .setFooter({ text: 'Sistema de Seguridad de Servidores', iconURL: guild.iconURL() })
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }

    // COMANDO BAN
    if (commandName === 'ban') {
        if (!usuario.bannable) return interaction.reply({ content: '❌ Operación denegada: El miembro posee inmunidad institucional o un rol superior.', ephemeral: true });
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
            .setFooter({ text: 'Registro Maestro de Sanciones', iconURL: guild.iconURL() })
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }

    // COMANDO UNBAN
    if (commandName === 'unban') {
        const userId = options.getString('id');
        try {
            await guild.members.unban(userId);

            const embed = new EmbedBuilder()
                .setTitle('✅ Revocación de Veto')
                .setColor('#57F287')
                .setDescription(`Se han restablecido los derechos de ingreso para la ID provista de forma exitosa.`)
                .addFields(
                    { name: '🆔 Identificador Removido', value: `\`${userId}\``, inline: true },
                    { name: '🛡️ Autorizado por', value: `${user.tag}`, inline: true }
                )
                .setFooter({ text: 'Registro Maestro de Revocaciones' })
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        } catch (error) {
            return interaction.reply({ content: '❌ Error: La ID provista no coincide con ningún baneo activo en el registro del servidor.', ephemeral: true });
        }
    }

    // COMANDO TIMEOUT
    if (commandName === 'timeout') {
        const minutes = options.getInteger('minutos');
        if (!usuario.moderatable) return interaction.reply({ content: '❌ Operación denegada: Imposible aplicar aislamiento a este rango de usuario.', ephemeral: true });
        
        await usuario.timeout(minutes * 60 * 1000, razon);

        const embed = new EmbedBuilder()
            .setTitle('⏳ Restricción Temporal (Aislamiento)')
            .setColor('#FEE75C')
            .setDescription(`Se han suspendido los permisos de comunicación escrita y verbal para **${usuario.user.username}**.`)
            .setThumbnail(usuario.user.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: '👤 Miembro Afectado', value: `${usuario.user.tag}`, inline: true },
                { name: '⏱️ Duración Estipulada', value: `\`${minutes} minutos\``, inline: true },
                { name: '🛡️ Aplicado por', value: `${user.tag}`, inline: false },
                { name: '📝 Justificación', value: `\`\`\`${razon}\`\`\``, inline: false }
            )
            .setFooter({ text: 'Módulo de Moderación Temporal' })
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }

    // COMANDO UNTIMEOUT
    if (commandName === 'untimeout') {
        if (!usuario.moderatable) return interaction.reply({ content: '❌ Operación denegada: No poseo la autoridad para modificar el estado de este miembro.', ephemeral: true });
        if (!usuario.communicationDisabledUntilTimestamp) return interaction.reply({ content: 'ℹ️ Estado actual: El miembro seleccionado no se encuentra bajo régimen de aislamiento.', ephemeral: true });

        try {
            await usuario.timeout(null);

            const embed = new EmbedBuilder()
                .setTitle('🔊 Restablecimiento de Comunicación')
                .setColor('#57F287')
                .setDescription(`Se ha levantado de forma anticipada el aislamiento impuesto sobre **${usuario.user.tag}**.`)
                .addFields(
                    { name: '👤 Miembro Restablecido', value: `${usuario.user.tag}`, inline: true },
                    { name: '🛡️ Gestionado por', value: `${user.tag}`, inline: true }
                )
                .setFooter({ text: 'Módulo de Moderación Temporal' })
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        } catch (error) {
            return interaction.reply({ content: '❌ Error al intentar procesar la restauración del miembro.', ephemeral: true });
        }
    }

    // COMANDO WARN
    if (commandName === 'warn') {
        if (usuario.user.bot) return interaction.reply({ content: '❌ Restricción del Sistema: Los perfiles automatizados (bots) no pueden recibir amonestaciones.', ephemeral: true });

        let listaWarns = {};
        try {
            const datosRaw = fs.readFileSync(ARCHIVO_WARNS, 'utf8');
            listaWarns = JSON.parse(datosRaw);
        } catch (e) {
            listaWarns = {};
        }

        if (!listaWarns[usuario.id]) {
            listaWarns[usuario.id] = [];
        }

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
            .setFooter({ text: 'Historial de Conducta y Disciplina' })
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }

    // COMANDO WARNS
    if (commandName === 'warns') {
        let listaWarns = {};
        try {
            const datosRaw = fs.readFileSync(ARCHIVO_WARNS, 'utf8');
            listaWarns = JSON.parse(datosRaw);
        } catch (e) {
            listaWarns = {};
        }

        const usuarioWarns = listaWarns[usuario.id] || [];
        const embed = new EmbedBuilder()
            .setThumbnail(usuario.user.displayAvatarURL({ dynamic: true }))
            .setTimestamp();

        if (usuarioWarns.length === 0) {
            embed.setTitle(`📋 Registro Expedito de ${usuario.user.username}`)
                 .setColor('#57F287')
                 .setDescription(`✅ **Estado: Limpio.**\nEste usuario no cuenta con reportes ni infracciones vigentes en la base de datos local.`);
            return interaction.reply({ embeds: [embed] });
        }

        embed.setTitle(`📋 Expediente de Infracciones`)
             .setColor('#F2A30F')
             .setDescription(`Mostrando el desglose de conductas archivadas para el miembro **${usuario.user.tag}**.\nTotal de registros: **${usuarioWarns.length}**\n─`);

        usuarioWarns.forEach((w, index) => {
            embed.addFields({
                name: `📁 Infracción #${index + 1} — Emitida el ${w.fecha}`,
                value: `**Supervisor:** \`${w.moderador}\`\n**Detalle:** *${w.razon}*`
            });
        });

        return interaction.reply({ embeds: [embed] });
    }

    // COMANDO DAR-ROL
    if (commandName === 'dar-rol') {
        const rol = options.getRole('rol');
        if (rol.position >= guild.members.me.roles.highest.position) {
            return interaction.reply({ content: '❌ Conflicto de Jerarquía: El rol solicitado se encuentra en un nivel superior al de este bot.', ephemeral: true });
        }
        if (usuario.roles.cache.has(rol.id)) {
            return interaction.reply({ content: `ℹ️ El miembro ya posee el rol **${rol.name}** asignado.`, ephemeral: true });
        }
        try {
            await usuario.roles.add(rol);

            const embed = new EmbedBuilder()
                .setTitle('💼 Modificación de Permisos: Rol Asignado')
                .setColor('#57F287')
                .setDescription(`Se han modificado exitosamente los privilegios jerárquicos del miembro.`)
                .addFields(
                    { name: '👤 Miembro Destino', value: `${usuario.user.tag}`, inline: true },
                    { name: '🛡️ Rol Otorgado', value: `<@&${rol.id}> (\`${rol.name}\`)`, inline: true },
                    { name: '✍️ Autorizado por', value: `${user.tag}`, inline: false }
                )
                .setFooter({ text: 'Gestión Administrativa de Roles' })
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        } catch (error) {
            return interaction.reply({ content: '❌ Error de API al intentar actualizar los roles.', ephemeral: true });
        }
    }

    // COMANDO QUITAR-ROL
    if (commandName === 'quitar-rol') {
        const rol = options.getRole('rol');
        if (rol.position >= guild.members.me.roles.highest.position) {
            return interaction.reply({ content: '❌ Conflicto de Jerarquía: El rol solicitado supera las capacidades operativas de este bot.', ephemeral: true });
        }
        if (!usuario.roles.cache.has(rol.id)) {
            return interaction.reply({ content: `ℹ️ El miembro no cuenta con el rol **${rol.name}** dentro de sus atribuciones.`, ephemeral: true });
        }
        try {
            await usuario.roles.remove(rol);

            const embed = new EmbedBuilder()
                .setTitle('💼 Modificación de Permisos: Rol Removido')
                .setColor('#ED4245')
                .setDescription(`Se han revocado ciertos accesos jerárquicos para el miembro.`)
                .addFields(
                    { name: '👤 Miembro Afectado', value: `${usuario.user.tag}`, inline: true },
                    { name: '🛡️ Rol Retirado', value: `<@&${rol.id}> (\`${rol.name}\`)`, inline: true },
                    { name: '✍️ Modificado por', value: `${user.tag}`, inline: false }
                )
                .setFooter({ text: 'Gestión Administrativa de Roles' })
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        } catch (error) {
            return interaction.reply({ content: '❌ Error de API al intentar remover los roles.', ephemeral: true });
        }
    }

    // COMANDO CLEAR
    if (commandName === 'clear') {
        const cantidad = options.getInteger('cantidad');
        try {
            const borrados = await channel.bulkDelete(cantidad, true);
            
            // Usamos un mensaje efímero limpio y corporativo para no ensuciar el chat limpio
            return interaction.reply({ 
                content: `🧹 **Mantenimiento Completado:** Se han purgado con éxito **${borrados.size} mensajes** de la cola reciente de este canal.`, 
                ephemeral: true 
            });
        } catch (error) {
            return interaction.reply({ content: '❌ Error Operacional: Imposible eliminar mensajes con una antigüedad mayor a 14 días.', ephemeral: true });
        }
    }

    // COMANDO NICK (Apodo propio)
    if (commandName === 'nick') {
        const nuevoApodo = options.getString('apodo') || null;
        const miMiembro = guild.members.cache.get(user.id);
        if (guild.ownerId === user.id) {
            return interaction.reply({ content: '❌ Limitación de Discord: Las directivas de la plataforma no permiten alterar la identidad del propietario del servidor.', ephemeral: true });
        }
        try {
            await miMiembro.setNickname(nuevoApodo);
            return interaction.reply({ 
                content: nuevoApodo ? `✅ **Identidad Ajustada:** Su apodo corporativo ha sido actualizado a **${nuevoApodo}**.` : '✅ **Identidad Restablecida:** Su apodo ha vuelto a los parámetros iniciales.', 
                ephemeral: true 
            });
        } catch (error) {
            return interaction.reply({ content: '❌ Conflicto Operacional: Jerarquía de roles insuficiente para alterar tu apodo actual.', ephemeral: true });
        }
    }

    // COMANDO SET-NICK (Apodo ajeno)
    if (commandName === 'set-nick') {
        const nuevoApodo = options.getString('apodo') || null;
        if (guild.ownerId === usuario.id) {
            return interaction.reply({ content: '❌ Operación Cancelada: Prohibido modificar credenciales del propietario del servidor.', ephemeral: true });
        }
        if (usuario.roles.highest.position >= guild.members.me.roles.highest.position) {
            return interaction.reply({ content: '❌ Conflicto de Jerarquía: El usuario seleccionado ostenta un rango equivalente o superior.', ephemeral: true });
        }
        try {
            await usuario.setNickname(nuevoApodo);
            
            const embed = new EmbedBuilder()
                .setTitle('👤 Actualización Administrativa de Identidad')
                .setColor('#57F287')
                .setDescription(nuevoApodo ? `Se ha asignado un nuevo alias administrativo para el miembro.` : `Se ha removido el alias, devolviendo el nombre por defecto.`)
                .addFields(
                    { name: '👤 Miembro Asignado', value: `${usuario.user.tag}`, inline: true },
                    { name: '📛 Nuevo Alias', value: `\`${nuevoApodo || 'Nombre Original'}\``, inline: true },
                    { name: '🛡️ Autorizado por', value: `${user.tag}`, inline: false }
                )
                .setFooter({ text: 'Registro de Cambios de Identidad' })
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        } catch (error) {
            return interaction.reply({ content: '❌ Error crítico en el procesamiento de cambio de apodo.', ephemeral: true });
        }
    }
});

client.login(TOKEN);