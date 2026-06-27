const { Client, GatewayIntentBits, AuditLogEvent, EmbedBuilder, REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildModeration, 
        GatewayIntentBits.GuildMembers
    ]
});

// CONFIGURACIÓN (Rellena estos datos)
const ID_CANAL_ALERTAS = '1518652067483353228'; 
const TOKEN = 'MTUxOTAyMzUxMDk4MTE4NTc5Ng.GQPtuN.HN8lri33F-R6WddgpFKQ2aiVVC__17R3GaqMEY';
const CLIENT_ID = '1519023510981185796'; // Lo encuentras en el Developer Portal (Application ID)

// 1. Registro de Comandos de Barra (Slash Commands)
const commands = [
    new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Expulsa a un miembro del servidor')
        .addUserOption(option => option.setName('usuario').setDescription('El usuario a expulsar').setRequired(true))
        .addStringOption(option => option.setName('razon').setDescription('Razón de la expulsión'))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

    new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Banea a un miembro del servidor')
        .addUserOption(option => option.setName('usuario').setDescription('El usuario a banear').setRequired(true))
        .addStringOption(option => option.setName('razon').setDescription('Razón del baneo'))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('Aisla temporalmente a un miembro')
        .addUserOption(option => option.setName('usuario').setDescription('El usuario a aislar').setRequired(true))
        .addIntegerOption(option => option.setName('minutos').setDescription('Tiempo en minutos').setRequired(true))
        .addStringOption(option => option.setName('razon').setDescription('Razón del aislamiento'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

client.once('ready', async () => {
    console.log(`🚀 ¡El bot ya está despierto como ${client.user.tag}!`);
    
    try {
        console.log('Cargando los comandos / en Discord...');
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
        console.log('¡Comandos / cargados con éxito!');
    } catch (error) {
        console.error('Error al cargar comandos:', error);
    }
});

// 2. Escuchar cuando un usuario ejecuta un comando
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, options, guild } = interaction;
    const usuario = options.getMember('usuario');
    const razon = options.getString('razon') || 'No se especificó razón';

    if (!usuario) {
        return interaction.reply({ content: 'No se encontró a ese usuario en el servidor.', ephemeral: false });
    }

    // COMANDO KICK
    if (commandName === 'kick') {
        if (!usuario.kickable) return interaction.reply({ content: 'No puedo expulsar a este usuario (puede tener un rol más alto que el mío).', ephemeral: false });
        await usuario.kick(razon);
        return interaction.reply({ content: `👢 **${usuario.user.tag}** ha sido expulsado.`, ephemeral: false });
    }

    // COMANDO BAN
    if (commandName === 'ban') {
        if (!usuario.bannable) return interaction.reply({ content: 'No puedo banear a este usuario.', ephemeral: false });
        await guild.members.ban(usuario.id, { reason: razon });
        return interaction.reply({ content: `🚨 **${usuario.user.tag}** ha sido baneado.`, ephemeral: false });
    }

    // COMANDO TIMEOUT (AISLAMIENTO)
    if (commandName === 'timeout') {
        const minutos = options.getInteger('minutos');
        if (!usuario.moderatable) return interaction.reply({ content: 'No puedo aislar a este usuario.', ephemeral: false });
        
        await usuario.timeout(minutos * 60 * 1000, razon);
        return interaction.reply({ content: `⏳ **${usuario.user.tag}** ha sido aislado por ${minutos} minutos.`, ephemeral: false });
    }
});

// 3. Eventos automáticos de Auditoría (Los que ya tenías)
client.on('guildBanAdd', async (ban) => {
    const canal = ban.guild.channels.cache.get(ID_CANAL_ALERTAS);
    if (!canal) return;
    const fetchedLogs = await ban.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberBanAdd });
    const banLog = fetchedLogs.entries.first();
    const responsable = banLog ? banLog.executor.tag : 'Desconocido';
    const embed = new EmbedBuilder().setTitle('🚨 Usuario Baneado').setColor(0x2759b0).setDescription(`**Usuario:** ${ban.user.tag}\n**Responsable:** ${responsable}\n**Razón:** ${ban.reason || 'No especificada'}`).setTimestamp();
    canal.send({ embeds: [embed] });
});

client.on('guildMemberUpdate', async (oldMember, newMember) => {
    const canal = newMember.guild.channels.cache.get(ID_CANAL_ALERTAS);
    if (!canal || !(!oldMember.communicationDisabledUntil && newMember.communicationDisabledUntil)) return;
    const fetchedLogs = await newMember.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberUpdate });
    const timeoutLog = fetchedLogs.entries.first();
    const responsable = timeoutLog ? timeoutLog.executor.tag : 'Desconocido';
    const embed = new EmbedBuilder().setTitle('⏳ Usuario Aislado (Timeout)').setColor(0x2759b0).setDescription(`**Usuario:** ${newMember.user.tag}\n**Responsable:** ${responsable}\n**Hasta:** ${newMember.communicationDisabledUntil.toLocaleString()}`).setTimestamp();
    canal.send({ embeds: [embed] });
});

client.on('guildMemberRemove', async (member) => {
    const canal = member.guild.channels.cache.get(ID_CANAL_ALERTAS);
    if (!canal) return;
    const fetchedLogs = await member.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberKick });
    const kickLog = fetchedLogs.entries.first();
    if (kickLog && kickLog.target.id === member.id && Date.now() - kickLog.createdAt < 10000) {
        const embed = new EmbedBuilder().setTitle('👢 Usuario Expulsado (Kick)').setColor(0x2759b0).setDescription(`**Usuario:** ${member.user.tag}\n**Responsable:** ${kickLog.executor.tag}\n**Razón:** ${kickLog.reason || 'No especificada'}`).setTimestamp();
        canal.send({ embeds: [embed] });
    }
});

client.login('MTUxOTAyMzUxMDk4MTE4NTc5Ng.GQPtuN.HN8lri33F-R6WddgpFKQ2aiVVC__17R3GaqMEY');
