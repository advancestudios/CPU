const { Client, GatewayIntentBits, EmbedBuilder, REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers
    ]
});

// CONFIGURACIÓN (Mantén tus credenciales)
const TOKEN = 'MTUxOTAyMzUxMDk4MTE4NTc5Ng.GQPtuN.HN8lri33F-R6WddgpFKQ2aiVVC__17R3GaqMEY';
const CLIENT_ID = '1519023510981185796'; 
const ARCHIVO_WARNS = path.join(__dirname, 'warns.json');

// Crear el archivo de base de datos local para los warns si no existe
if (!fs.existsSync(ARCHIVO_WARNS)) {
    fs.writeFileSync(ARCHIVO_WARNS, JSON.stringify({}), 'utf8');
}

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
        .addIntegerOption(option => 
            option.setName('minutos')
                .setDescription('Selecciona el tiempo de aislamiento')
                .setRequired(true)
                .addChoices(
                    { name: '60 segundos', value: 1 },
                    { name: '5 minutos', value: 5 },
                    { name: '10 minutos', value: 10 },
                    { name: '1 hora', value: 60 },
                    { name: '1 día', value: 1440 },
                    { name: '1 semana', value: 10080 }
                )
        )
        .addStringOption(option => option.setName('razon').setDescription('Razón del aislamiento'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Aplica una advertencia a un miembro')
        .addUserOption(option => option.setName('usuario').setDescription('El usuario a advertir').setRequired(true))
        .addStringOption(option => option.setName('razon').setDescription('Razón de la advertencia'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

client.once('ready', async () => {
    console.log(`🚀 Bot de comandos activo como ${client.user.tag}`);
    try {
        console.log('Cargando los comandos de moderación en Discord...');
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
        console.log('¡Comandos cargados con éxito!');
    } catch (error) {
        console.error('Error al cargar comandos:', error);
    }
});

// 2. Ejecución de los Comandos
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, options, guild, user } = interaction;
    const usuario = options.getMember('usuario');
    const razon = options.getString('razon') || 'No se especificó razón';

    if (!usuario) {
        return interaction.reply({ content: 'No se encontró a ese usuario en el servidor.', ephemeral: false });
    }

    // COMANDO KICK
    if (commandName === 'kick') {
        if (!usuario.kickable) return interaction.reply({ content: 'No puedo expulsar a este usuario (jerarquía de roles).', ephemeral: false });
        await usuario.kick(razon);
        return interaction.reply({ content: `绿色 **${usuario.user.tag}** ha sido expulsado correctamente.`, ephemeral: false });
    }

    // COMANDO BAN
    if (commandName === 'ban') {
        if (!usuario.bannable) return interaction.reply({ content: 'No puedo banear a este usuario.', ephemeral: false });
        await guild.members.ban(usuario.id, { reason: razon });
        return interaction.reply({ content: `🚨 **${usuario.user.tag}** ha sido baneado correctamente.`, ephemeral: false });
    }

    // COMANDO TIMEOUT
    if (commandName === 'timeout') {
        const minutos = options.getInteger('minutos');
        if (!usuario.moderatable) return interaction.reply({ content: 'No puedo aislar a este usuario.', ephemeral: false });
        
        await usuario.timeout(minutos * 60 * 1000, razon);
        return interaction.reply({ content: `⏳ **${usuario.user.tag}** ha sido aislado por ${minutos} minutos correctamente.`, ephemeral: false });
    }

    // COMANDO WARN
    if (commandName === 'warn') {
        if (usuario.user.bot) return interaction.reply({ content: 'No puedes advertir a un bot.', ephemeral: false });

        const datosRaw = fs.readFileSync(ARCHIVO_WARNS, 'utf8');
        const listaWarns = JSON.parse(datosRaw);

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

        return interaction.reply({ 
            content: `⚠️ **${usuario.user.tag}** ha sido advertido. (Total de advertencias: **${totalWarns}**)`, 
            ephemeral: false 
        });
    }
});

client.login('MTUxOTAyMzUxMDk4MTE4NTc5Ng.GQPtuN.HN8lri33F-R6WddgpFKQ2aiVVC__17R3GaqMEY');
