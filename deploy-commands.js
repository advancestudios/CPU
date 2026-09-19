// Registra (o actualiza) los comandos de barra en Discord.
// Corre esto UNA VEZ al desplegar, y cada vez que agregues, edites o borres
// un archivo dentro de /commands. El bot (index.js) ya NO registra comandos
// solo, para no reintentar el registro en cada reinicio.
//
// Uso:  node deploy-commands.js   (o "npm run deploy")

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

if (!TOKEN || !CLIENT_ID) {
    console.error('❌ Faltan DISCORD_TOKEN o CLIENT_ID en tu archivo .env.');
    process.exit(1);
}

const commands = [];
for (const archivo of fs.readdirSync(path.join(__dirname, 'commands')).filter(f => f.endsWith('.js'))) {
    const comando = require(path.join(__dirname, 'commands', archivo));
    commands.push(comando.data.toJSON());
}

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        console.log(`🔄 Registrando ${commands.length} comandos de barra...`);
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
        console.log('✅ Comandos de barra sincronizados de forma global (puede tardar hasta 1 hora en verse).');
    } catch (error) {
        console.error('❌ Error crítico al sincronizar comandos:', error);
    }
})();
