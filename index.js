require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const { Client, GatewayIntentBits, Collection, ActivityType } = require('discord.js');
const { conectarMongo } = require('./utils/db');
const { PREFIX } = require('./utils/constants');

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

if (!TOKEN || !CLIENT_ID) {
    console.error('❌ Faltan DISCORD_TOKEN o CLIENT_ID en tu archivo .env.');
    process.exit(1);
}

// Conexión a MongoDB (config universal + warns)
conectarMongo();

// Servidor web de monitoreo (para hosts tipo Render/UptimeRobot)
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('🤖 CPU v2 - En Linea'));
app.listen(PORT, () => console.log(`🌐 [CPU v2] Servidor web de monitoreo activo en el puerto ${PORT}`));

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

// ── Carga dinámica: comandos slash (carpeta /commands) ──
client.commands = new Collection();
for (const archivo of fs.readdirSync(path.join(__dirname, 'commands')).filter(f => f.endsWith('.js'))) {
    const comando = require(path.join(__dirname, 'commands', archivo));
    client.commands.set(comando.data.name, comando);
}

// ── Carga dinámica: comandos con prefijo ";" (carpeta /prefixCommands) ──
client.prefixCommands = new Collection();
for (const archivo of fs.readdirSync(path.join(__dirname, 'prefixCommands')).filter(f => f.endsWith('.js'))) {
    const comando = require(path.join(__dirname, 'prefixCommands', archivo));
    client.prefixCommands.set(comando.name, comando);
}

// ── Carga dinámica: botones (carpeta /components) ──
client.buttons = new Collection();
for (const archivo of fs.readdirSync(path.join(__dirname, 'components')).filter(f => f.endsWith('.js'))) {
    const boton = require(path.join(__dirname, 'components', archivo));
    client.buttons.set(boton.customId, boton);
}

// ── Carga dinámica: modales (carpeta /modals) ──
client.modals = new Collection();
for (const archivo of fs.readdirSync(path.join(__dirname, 'modals')).filter(f => f.endsWith('.js'))) {
    const modal = require(path.join(__dirname, 'modals', archivo));
    client.modals.set(modal.customId, modal);
}

// ── Carga dinámica: eventos (carpeta /events) ──
for (const archivo of fs.readdirSync(path.join(__dirname, 'events')).filter(f => f.endsWith('.js'))) {
    const evento = require(path.join(__dirname, 'events', archivo));
    if (evento.once) {
        client.once(evento.name, (...args) => evento.execute(...args, client));
    } else {
        client.on(evento.name, (...args) => evento.execute(...args, client));
    }
}

client.login(TOKEN);
