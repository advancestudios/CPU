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
// 1. REGISTRO DE COMANDOS DE BARRA (SLASH)
// ==========================================
const commands = [
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
        console.log('✅ [CPU v1.0] Comandos sincronizados de forma global.');
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

    // Helper para responder por texto tradicional
    const responder = (opciones) => message.channel.send(opciones);

    if (command === 'lock') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return message.reply('❌ Permisos insuficientes.');
        }
        return ejecutarLock(message.channel, message.author, responder);
    }

    if (command === 'unlock') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return message.reply('❌ Permisos insuficientes.');
        }
        return ejecutarUnlock(message.channel, message.author, responder);
    }

    // AQUÍ IRÁN LOS NUEVOS COMANDOS EXCLUSIVOS POR PREFIX QUE ME PIDAS 🚀
});

// ==========================================
// 3. MANEJADOR DE INTERACCIONES SLASH (/)
// ==========================================
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, guild, user, channel } = interaction;

    // Helper para responder por interacción de barra
    const responder = (opciones) => interaction.reply(opciones);

    if (commandName === 'lock') {
        return ejecutarLock(channel, user, responder);
    }

    if (commandName === 'unlock') {
        return ejecutarUnlock(channel, user, responder);
    }

    if (commandName === 'set-canal-postulaciones') {
        const canalTexto = interaction.options.getChannel('canal');
        const config = obtenerConfig();
        config[guild.id] = canalTexto.id;
        guardarConfig(config);

        const embed = new EmbedBuilder()
            .setTitle('⚙️ Configuración del Canal de Postulaciones')
            .setColor('#57F287')
            .setDescription(`Se ha vinculado el canal <#${canalTexto.id}> para recibir los expedientes enviadas por **CPU v1.0**.`)
            .setFooter({ text: 'Sistema de Reclutamiento • CPU v1.0' })
            .setTimestamp();

        return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (commandName === 'postularse') {
        const config = obtenerConfig();
        const canalId = config[guild.id];

        if (!canalId) {
            return interaction.reply({ 
                content: '⚠️ El sistema de postulaciones no ha sido configurado. Usa `/set-canal-postulaciones`.', 
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
            await interaction.reply({ content: '📬 Te enviamos un MD para comenzar tu postulación.', ephemeral: true });

            const collector = mensajeDM.createMessageComponentCollector({ time: 60000 });

            collector.on('collect', async i => {
                if (i.customId === 'cancelar_postulacion') {
                    await i.update({ content: '❌ Has cancelado la postulación.', embeds: [], components: [] });
                    return;
                }

                if (i.customId === 'iniciar_postulacion') {
                    await i.update({ content: '📝 **Proceso Iniciado.** Responde a las preguntas directamente por este chat.', embeds: [], components: [] });

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
                        await dmChannel.send('✅ **¡Postulación enviada con éxito!**');
                    } else {
                        await dmChannel.send('⚠️ Hubo un error al enviar el expediente. Contacta a un admin.');
                    }
                }
            });

        } catch (error) {
            return interaction.reply({ content: '❌ No pude enviarte un mensaje privado. Revisa tus ajustes de privacidad.', ephemeral: true });
        }
    }
});

client.login(TOKEN);
