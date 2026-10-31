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

// Servidor web y API para el Dashboard
const app = express();
app.use(express.json());

// 🟢 Cabeceras para permitir que Netlify lea los datos de tu API sin bloqueos del navegador
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    next();
});

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

// ==========================================
// 🌐 ENDPOINTS DE LA API PARA EL DASHBOARD
// ==========================================

app.get('/guild', async (req, res) => {
    try {
        const guildId = req.query.guild_id;
        if (!guildId) return res.status(400).json({ error: "Falta el parámetro guild_id" });

        const guild = client.guilds.cache.get(guildId);
        if (!guild) return res.status(404).json({ error: "El bot no está en este servidor o no está disponible" });

        const channels = guild.channels.cache
            .filter(c => c.type === 0)
            .map(c => ({ id: c.id, name: c.name }));

        const categories = guild.channels.cache
            .filter(c => c.type === 4)
            .map(c => ({ id: c.id, name: c.name }));

        const roles = guild.roles.cache
            .filter(r => r.id !== guild.id)
            .map(r => ({ id: r.id, name: r.name }));

        res.json({ channels, categories, roles });
    } catch (error) {
        console.error("Error en GET /guild:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

app.post('/send', async (req, res) => {
    try {
        const { guildId, channelId, content } = req.body;
        const guild = client.guilds.cache.get(guildId);
        if (!guild) return res.status(404).json({ error: "Servidor no encontrado" });

        const channel = guild.channels.cache.get(channelId);
        if (!channel) return res.status(404).json({ error: "Canal no encontrado" });

        await channel.send({ content });
        res.json({ success: true });
    } catch (error) {
        console.error("Error en POST /send:", error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/embed', async (req, res) => {
    try {
        const { guildId, channelId, embed } = req.body;
        const guild = client.guilds.cache.get(guildId);
        if (!guild) return res.status(404).json({ error: "Servidor no encontrado" });

        const channel = guild.channels.cache.get(channelId);
        if (!channel) return res.status(404).json({ error: "Canal no encontrado" });

        const processText = (text) => text ? text.replace(/\{sp\}/g, '\n') : text;

        const formattedEmbed = {
            title: processText(embed.title),
            description: processText(embed.description),
            color: embed.color || null,
            footer: embed.footer ? { text: processText(embed.footer) } : null,
            thumbnail: embed.thumbnail ? { url: embed.thumbnail } : null,
            image: embed.image ? { url: embed.image } : null,
            timestamp: embed.timestamp ? new Date() : null,
        };

        if (embed.author) {
            formattedEmbed.author = { name: processText(embed.author) };
        }

        Object.keys(formattedEmbed).forEach(key => formattedEmbed[key] === null && delete formattedEmbed[key]);

        await channel.send({ embeds: [formattedEmbed] });
        res.json({ success: true });
    } catch (error) {
        console.error("Error en POST /embed:", error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/tickets/setup', async (req, res) => {
    try {
        const { guildId, categoryId } = req.body;
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/tickets/panel', async (req, res) => {
    try {
        const { guildId, channelId } = req.body;
        const guild = client.guilds.cache.get(guildId);
        const channel = guild.channels.cache.get(channelId);
        
        await channel.send({ content: "🎟️ **Panel de Tickets** (Configurado desde el Dashboard)" });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/tickets/support-role', async (req, res) => {
    try {
        const { guildId, roleId } = req.body;
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => console.log(`🌐 [CPU v2] Servidor web y API activos en el puerto ${PORT}`));

client.login(TOKEN);
