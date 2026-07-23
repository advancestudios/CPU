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

// CONFIGURACIÓN
const TOKEN = 'MTUxOTAyMzUxMDk4MTE4NTc5Ng.GMl5Qk.5UH5rPOusVjYQgRJ6zK8MMAfU6ZPgDSXJcHB1c';
const CLIENT_ID = '1519023510981185796'; 
const ARCHIVO_WARNS = path.join(__dirname, 'warns.json');
const ARCHIVO_CONFIG = path.join(__dirname, 'config.json');

// Servidor Express para Render
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('🤖 CPU v1.0 - El Cerebro Operativo de tu Servidor está Online.');
});

app.listen(PORT, () => {
    console.log(`🌐 [CPU v1.0] Servidor web de monitoreo activo en el puerto ${PORT}`);
});

// Inicializar archivos locales
if (!fs.existsSync(ARCHIVO_WARNS)) fs.writeFileSync(ARCHIVO_WARNS, JSON.stringify({}), 'utf8');
if (!fs.existsSync(ARCHIVO_CONFIG)) fs.writeFileSync(ARCHIVO_CONFIG, JSON.stringify({}), 'utf8');

// Helper para leer/escribir configuración de canales
function obtenerConfig() {
    try { return JSON.parse(fs.readFileSync(ARCHIVO_CONFIG, 'utf8')); } catch { return {}; }
}
function guardarConfig(data) {
    fs.writeFileSync(ARCHIVO_CONFIG, JSON.stringify(data, null, 2), 'utf8');
}

// 1. Registro y Definición de Comandos de Barra
const commands = [
    new SlashCommandBuilder()
        .setName('postularse')
        .setDescription('Inicia tu proceso de postulación para el equipo de Staff mediante MD'),

    new SlashCommandBuilder()
        .setName('set-canal-postulaciones')
        .setDescription('Configura el canal donde CPU v1.0 enviará los expedientes de postulación')
        .addChannelOption(option => 
            option.setName('canal')
                .setDescription('Canal de texto de recepción')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

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
    console.log(`🚀 [CPU v1.0] Núcleo operativo inicializado y activo como ${client.user.tag}`);
    try {
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
        console.log('✅ [CPU v1.0] Comandos de barra sincronizados de forma global.');
    } catch (error) {
        console.error('❌ [CPU v1.0] Error crítico al sincronizar comandos:', error);
    }
});

// 2. Orquestador de Interacciones
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, options, guild, user, channel } = interaction;

    // CONFIGURACIÓN DEL CANAL DE POSTULACIONES
    if (commandName === 'set-canal-postulaciones') {
        const canalTexto = options.getChannel('canal');
        const config = obtenerConfig();
        config[guild.id] = canalTexto.id;
        guardarConfig(config);

        const embed = new EmbedBuilder()
            .setTitle('⚙️ Configuración del Canal de Postulaciones')
            .setColor('#57F287')
            .setDescription(`Se ha vinculado exitosamente el canal <#${canalTexto.id}> para recibir los expedientes de candidatos enviado por **CPU v1.0**.`)
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
                content: '⚠️ El sistema de postulaciones aún no ha sido configurado en este servidor. Pide a un administrador usar `/set-canal-postulaciones`.', 
                ephemeral: true 
            });
        }

        // Crear botones de Aceptar / Rechazar
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('iniciar_postulacion')
                .setLabel('Aceptar')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('cancelar_postulacion')
                .setLabel('Rechazar')
                .setStyle(ButtonStyle.Danger)
        );

        const embedMD = new EmbedBuilder()
            .setTitle(`📜 Postulación al Equipo de Staff — ${guild.name}`)
            .setColor('#57F287')
            .setDescription(`¡Hola, **${user.username}**!\n\nBienvenido al proceso oficial de postulación para formar parte del equipo de Staff en **${guild.name}**.\n\nPresiona **Aceptar** para iniciar con las preguntas o **Rechazar** si ejecutaste el comando por error.`)
            .setThumbnail(guild.iconURL({ dynamic: true }))
            .setFooter({ text: 'Sistema Central CPU v1.0 • Módulo de Selección' })
            .setTimestamp();

        try {
            const mensajeDM = await user.send({ embeds: [embedMD], components: [row] });
            await interaction.reply({ content: '📬 Te hemos enviado un Mensaje Directo (MD) con la información para comenzar tu postulación.', ephemeral: true });

            // Colector para esperar la respuesta del botón en MD
            const collector = mensajeDM.createMessageComponentCollector({ time: 60000 });

            collector.on('collect', async i => {
                if (i.customId === 'cancelar_postulacion') {
                    await i.update({ content: '❌ Has cancelado el proceso de postulación.', embeds: [], components: [] });
                    return;
                }

                if (i.customId === 'iniciar_postulacion') {
                    await i.update({ content: '📝 **Proceso Iniciado.** Por favor responde a las siguientes preguntas directamente por este chat.', embeds: [], components: [] });

                    const preguntas = [
                        '1️⃣ ¿Qué edad tienes y cuál es tu país de residencia?',
                        '2️⃣ ¿Tienes experiencia previa como Moderador o Staff en otros servidores?',
                        '3️⃣ ¿Cuántas horas diarias podrías dedicar a la supervisión de la comunidad?',
                        '4️⃣ ¿Cómo reaccionarías si presencias una discusión subida de tono entre miembros?'
                    ];

                    const respuestas = [];
                    const dmChannel = await user.createDM();

                    for (const preg of preguntas) {
                        await dmChannel.send(`📌 **Pregunta:** ${preg}`);
                        try {
                            const resp = await dmChannel.awaitMessages({
                                filter: m => m.author.id === user.id,
                                max: 1,
                                time: 180000, // 3 minutos por respuesta
                                errors: ['time']
                            });
                            respuestas.push(resp.first().content);
                        } catch (e) {
                            return dmChannel.send('⏳ Se ha agotado el tiempo de respuesta. La postulación ha sido cancelada.');
                        }
                    }

                    // Enviar expediente recopilado al canal del servidor
                    const canalDestino = guild.channels.cache.get(canalId);
                    if (canalDestino) {
                        const embedExpediente = new EmbedBuilder()
                            .setTitle('📥 Nueva Postulación de Candidato')
                            .setColor('#FEE75C')
                            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                            .setDescription(`Se ha recibido un nuevo expediente enviado por **${user.tag}** (\`ID: ${user.id}\`).`)
                            .addFields(
                                { name: preguntas[0], value: respuestas[0] },
                                { name: preguntas[1], value: respuestas[1] },
                                { name: preguntas[2], value: respuestas[2] },
                                { name: preguntas[3], value: respuestas[3] }
                            )
                            .setFooter({ text: 'Sistema de Reclutamiento • CPU v1.0' })
                            .setTimestamp();

                        await canalDestino.send({ embeds: [embedExpediente] });
                        await dmChannel.send('✅ **¡Postulación completada con éxito!** Tus respuestas han sido enviadas al equipo administrativo.');
                    } else {
                        await dmChannel.send('⚠️ Hubo un problema al entregar tu expediente en el servidor. Contacta a un Administrador.');
                    }
                }
            });

        } catch (error) {
            return interaction.reply({ content: '❌ No pude enviarte un Mensaje Directo. Asegúrate de tener activada la opción de recibir mensajes privados de miembros del servidor.', ephemeral: true });
        }
    }

    // [RESTO DE COMANDOS SE MANTIENEN IGUALES COMO KICK, BAN, WARN, ETC.]
    // ...
});

client.login(TOKEN);
