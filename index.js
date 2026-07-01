const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

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

// Crear el archivo de almacenamiento local si no existe
if (!fs.existsSync(ARCHIVO_WARNS)) {
    fs.writeFileSync(ARCHIVO_WARNS, JSON.stringify({}), 'utf8');
}

// 1. Registro de Todos los Comandos de Barra
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

    new SlashCommandBuilder()
        .setName('dar-rol')
        .setDescription('Asigna un rol a un usuario')
        .addUserOption(option => option.setName('usuario').setDescription('El usuario que recibirá el rol').setRequired(true))
        .addRoleOption(option => option.setName('rol').setDescription('El rol que vas a asignar').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

    new SlashCommandBuilder()
        .setName('quitar-rol')
        .setDescription('Le quita un rol a un usuario')
        .addUserOption(option => option.setName('usuario').setDescription('El usuario al que le quitarás el rol').setRequired(true))
        .addRoleOption(option => option.setName('rol').setDescription('El rol que vas a quitar').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

    // NUEVO: Comando /clear para limpiar mensajes
    new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Borra una cantidad específica de mensajes del chat')
        .addIntegerOption(option => 
            option.setName('cantidad')
                .setDescription('Número de mensajes a borrar (1-100)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    // NUEVO: Comando /nick para cambiarse el nombre a uno mismo
    new SlashCommandBuilder()
        .setName('nick')
        .setDescription('Cambia tu propio apodo en el servidor')
        .addStringOption(option => option.setName('apodo').setDescription('Tu nuevo apodo (deja vacío para restablecer)').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ChangeNickname),

    // NUEVO: Comando /set-nick para cambiar el nombre a otros
    new SlashCommandBuilder()
        .setName('set-nick')
        .setDescription('Cambia el apodo de otro miembro del servidor')
        .addUserOption(option => option.setName('usuario').setDescription('El usuario al que le cambiarás el apodo').setRequired(true))
        .addStringOption(option => option.setName('apodo').setDescription('El nuevo apodo (deja vacío para restablecer)').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames),

].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

client.once('ready', async () => {
    console.log(`🚀 Bot de comandos activo como ${client.user.tag}`);
    try {
        console.log('Forzando actualización de comandos en Discord...');
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
        console.log('¡Todos los comandos cargados y actualizados con éxito!');
    } catch (error) {
        console.error('Error al cargar comandos:', error);
    }
});

// 2. Ejecución de los Comandos
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, options, guild, user, channel } = interaction;
    const usuario = options.getMember('usuario');
    const razon = options.getString('razon') || 'No se especificó razón';

    // Validación para comandos que requieren obligatoriamente un usuario objetivo externo
    if (!usuario && ['kick', 'ban', 'timeout', 'warn', 'dar-rol', 'quitar-rol', 'set-nick'].includes(commandName)) {
        return interaction.reply({ content: 'No se encontró a ese usuario en el servidor.', ephemeral: true });
    }

    // COMANDO KICK
    if (commandName === 'kick') {
        if (!usuario.kickable) return interaction.reply({ content: 'No se pudo expulsar a este usuario (jerarquía de roles).', ephemeral: false });
        await usuario.kick(razon);
        return interaction.reply({ content: `👢 **${usuario.user.tag}** ha sido expulsado.`, ephemeral: false });
    }

    // COMANDO BAN
    if (commandName === 'ban') {
        if (!usuario.bannable) return interaction.reply({ content: 'No se pudo banear a este usuario.', ephemeral: false });
        await guild.members.ban(usuario.id, { reason: razon });
        return interaction.reply({ content: `🚨 **${usuario.user.tag}** ha sido baneado.`, ephemeral: false });
    }

    // COMANDO TIMEOUT
    if (commandName === 'timeout') {
        const minutes = options.getInteger('minutos');
        if (!usuario.moderatable) return interaction.reply({ content: 'No se pudo aislar a este usuario.', ephemeral: false });
        
        await usuario.timeout(minutes * 60 * 1000, razon);
        return interaction.reply({ content: `⏳ **${usuario.user.tag}** ha sido aislado por ${minutes} minutos.`, ephemeral: false });
    }

    // COMANDO WARN
    if (commandName === 'warn') {
        if (usuario.user.bot) return interaction.reply({ content: 'No puedes advertir a un bot.', ephemeral: false });

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

        return interaction.reply({ 
            content: `⚠️ **${usuario.user.tag}** ha sido advertido. (Total de advertencias: **${totalWarns}**)`, 
            ephemeral: false 
        });
    }

    // COMANDO DAR-ROL
    if (commandName === 'dar-rol') {
        const rol = options.getRole('rol');
        if (rol.position >= guild.members.me.roles.highest.position) {
            return interaction.reply({ content: 'No puedo asignar ese rol porque está en una posición igual o superior a mi rol más alto.', ephemeral: true });
        }
        if (usuario.roles.cache.has(rol.id)) {
            return interaction.reply({ content: `El usuario ya tiene el rol **${rol.name}**.`, ephemeral: true });
        }
        try {
            await usuario.roles.add(rol);
            return interaction.reply({ content: `✅ Se ha asignado el rol **${rol.name}** a **${usuario.user.tag}**.` });
        } catch (error) {
            console.error(error);
            return interaction.reply({ content: 'Hubo un error al intentar añadir el rol.', ephemeral: true });
        }
    }

    // COMANDO QUITAR-ROL
    if (commandName === 'quitar-rol') {
        const rol = options.getRole('rol');
        if (rol.position >= guild.members.me.roles.highest.position) {
            return interaction.reply({ content: 'No puedo quitar ese rol porque está en una posición igual o superior a mi rol más alto.', ephemeral: true });
        }
        if (!usuario.roles.cache.has(rol.id)) {
            return interaction.reply({ content: `El usuario no tiene el rol **${rol.name}**.`, ephemeral: true });
        }
        try {
            await usuario.roles.remove(rol);
            return interaction.reply({ content: `❌ Se ha quitado el rol **${rol.name}** a **${usuario.user.tag}**.` });
        } catch (error) {
            console.error(error);
            return interaction.reply({ content: 'Hubo un error al intentar quitar el rol.', ephemeral: true });
        }
    }

    // NUEVO: EJECUCIÓN DE CLEAR
    if (commandName === 'clear') {
        const cantidad = options.getInteger('cantidad');

        try {
            const borrados = await channel.bulkDelete(cantidad, true);
            return interaction.reply({ content: `🧹 Se han eliminado **${borrados.size}** mensajes correctamente.`, ephemeral: true });
        } catch (error) {
            console.error(error);
            return interaction.reply({ content: 'Hubo un error al intentar borrar los mensajes. (Nota: Discord no permite borrar mensajes con más de 14 días de antigüedad).', ephemeral: true });
        }
    }

    // NUEVO: EJECUCIÓN DE NICK (Para uno mismo)
    if (commandName === 'nick') {
        const nuevoApodo = options.getString('apodo') || null;
        const miMiembro = guild.members.cache.get(user.id);

        // Validar si es el dueño del servidor (Discord no permite cambiarle el nombre al Owner vía Bot)
        if (guild.ownerId === user.id) {
            return interaction.reply({ content: 'Eres el dueño del servidor. Discord no permite que un bot cambie el apodo del propietario.', ephemeral: true });
        }

        try {
            await miMiembro.setNickname(nuevoApodo);
            return interaction.reply({ content: nuevoApodo ? `Ajustado tu apodo a: **${nuevoApodo}**.` : 'Tu apodo ha sido restablecido al original.', ephemeral: true });
        } catch (error) {
            console.error(error);
            return interaction.reply({ content: 'No tengo permisos para cambiar tu apodo (jerarquía de roles).', ephemeral: true });
        }
    }

    // NUEVO: EJECUCIÓN DE SET-NICK (Para otros usuarios)
    if (commandName === 'set-nick') {
        const nuevoApodo = options.getString('apodo') || null;

        if (guild.ownerId === usuario.id) {
            return interaction.reply({ content: 'No puedo cambiarle el apodo al dueño del servidor.', ephemeral: true });
        }

        // Validar jerarquía del bot con respecto al usuario objetivo
        if (usuario.roles.highest.position >= guild.members.me.roles.highest.position) {
            return interaction.reply({ content: 'No puedo cambiar el apodo de este usuario porque tiene un rol superior o igual al mío.', ephemeral: true });
        }

        try {
            await usuario.setNickname(nuevoApodo);
            return interaction.reply({ content: nuevoApodo ? `Se cambió el apodo de **${usuario.user.tag}** a **${nuevoApodo}**.` : `Se restableció el apodo de **${usuario.user.tag}**.` });
        } catch (error) {
            console.error(error);
            return interaction.reply({ content: 'Hubo un error al intentar cambiar el apodo de este usuario.', ephemeral: true });
        }
    }
});

client.login(TOKEN);
