require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const { Client, GatewayIntentBits, Collection, ActivityType } = require('discord.js');
const { conectarMongo } = require('./utils/db');
const { PREFIX } = require('./utils/constants');
const { montarApi } = require('./api');

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

if (!TOKEN || !CLIENT_ID) {
    console.error('❌ Faltan DISCORD_TOKEN o CLIENT_ID en tu archivo .env.');
    process.exit(1);
}

try {
    conectarMongo();
} catch (e) {
    console.log("Mongo connection warning:", e.message);
}

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('🤖 CPU v2 - En Linea'));

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent
    ],
    ws: {
        properties: {
            browser: 'Discord Android'
        }
    },
    presence: {
        status: 'online',
        activities: [{
            name: 'Cooking up a new update...',
            type: ActivityType.Streaming,
            url: 'https://www.twitch.tv/discord'
        }]
    }
});

client.PREFIX = PREFIX;

// ── Carga dinámica de módulos ──
// Si un archivo tiene un error, se avisa en la consola (antes se ignoraba en silencio
// y el comando/botón simplemente "no existía").
function cargarCarpeta(carpeta, alCargar) {
    const dir = path.join(__dirname, carpeta);
    if (!fs.existsSync(dir)) return 0;
    let total = 0;
    for (const archivo of fs.readdirSync(dir).filter(f => f.endsWith('.js'))) {
        try {
            alCargar(require(path.join(dir, archivo)), archivo);
            total++;
        } catch (err) {
            console.error(`❌ No se pudo cargar ${carpeta}/${archivo}:`, err);
        }
    }
    return total;
}

client.commands = new Collection();        // /comandos (carpeta commands)
client.prefixCommands = new Collection();  // ;comandos (carpeta prefixCommands)
client.buttons = new Collection();         // botones (carpeta components)  ← faltaba
client.modals = new Collection();          // formularios (carpeta modals)  ← faltaba

const n = {
    slash: cargarCarpeta('commands', (c, f) => { if (!c?.data?.name) throw new Error(`${f} no tiene "data.name"`); client.commands.set(c.data.name, c); }),
    prefijo: cargarCarpeta('prefixCommands', (c, f) => { if (!c?.name) throw new Error(`${f} no tiene "name"`); client.prefixCommands.set(c.name, c); }),
    botones: cargarCarpeta('components', (c, f) => { if (!c?.customId) throw new Error(`${f} no tiene "customId"`); client.buttons.set(c.customId, c); }),
    modales: cargarCarpeta('modals', (c, f) => { if (!c?.customId) throw new Error(`${f} no tiene "customId"`); client.modals.set(c.customId, c); }),
    eventos: cargarCarpeta('events', (e) => {
        // Los errores de un evento se capturan aquí para que nunca tumben el bot
        const manejar = async (...args) => {
            try { await e.execute(...args, client); }
            catch (err) { console.error(`Error en el evento ${e.name}:`, err); }
        };
        e.once ? client.once(e.name, manejar) : client.on(e.name, manejar);
    })
};
console.log(`📦 Cargados: ${n.slash} comandos /, ${n.prefijo} comandos ;, ${n.botones} botones, ${n.modales} formularios, ${n.eventos} eventos`);

// Un error suelto no debe apagar el bot
process.on('unhandledRejection', (err) => console.error('⚠️ Promesa rechazada sin capturar:', err));
process.on('uncaughtException', (err) => console.error('⚠️ Error sin capturar:', err));
client.on('error', (err) => console.error('⚠️ Error del cliente de Discord:', err));

// 🌐 API del dashboard (rutas en api.js)
montarApi(app, client);

app.listen(PORT, () => console.log(`🌐 [CPU v2] Servidor web y API activos en el puerto ${PORT}`));

client.login(TOKEN);
