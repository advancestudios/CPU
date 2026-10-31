require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const { Client, GatewayIntentBits, Collection, ActivityType, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { conectarMongo } = require('./utils/db');
const { PREFIX } = require('./utils/constants');

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

// Cabeceras CORS para Netlify
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

// Carga dinámica básica
client.commands = new Collection();
if (fs.existsSync(path.join(__dirname, 'commands'))) {
    for (const archivo of fs.readdirSync(path.join(__dirname, 'commands')).filter(f => f.endsWith('.js'))) {
        try {
            const comando = require(path.join(__dirname, 'commands', archivo));
            if (comando?.data?.name) client.commands.set(comando.data.name, comando);
        } catch (err) {}
    }
}

client.prefixCommands = new Collection();
if (fs.existsSync(path.join(__dirname, 'prefixCommands'))) {
    for (const archivo of fs.readdirSync(path.join(__dirname, 'prefixCommands')).filter(f => f.endsWith('.js'))) {
        try {
            const comando = require(path.join(__dirname, 'prefixCommands', archivo));
            if (comando?.name) client.prefixCommands.set(comando.name, comando);
        } catch (err) {}
    }
}

// Endpoints API
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

// Endpoint /embed con soporte para componentes / botones (Component V2)
app.post('/embed', async (req, res) => {
    try {
        const { guildId, channelId, embed, buttons } = req.body;
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

        let payload = { embeds: [formattedEmbed] };

        // Procesar botones / componentes v2 si existen
        if (buttons && Array.isArray(buttons) && buttons.length > 0) {
            const row = new ActionRowBuilder();
            buttons.forEach(btn => {
                if (btn.label && btn.url) {
                    row.addComponents(
                        new ButtonBuilder()
                            .setLabel(btn.label)
                            .setStyle(ButtonStyle.Link)
                            .setURL(btn.url)
                    );
                }
            });
            if (row.components.length > 0) {
                payload.components = [row];
            }
        }

        await channel.send(payload);
        res.json({ success: true });
    } catch (error) {
        console.error("Error en POST /embed:", error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => console.log(`🌐 [CPU v2] Servidor web y API activos en el puerto ${PORT}`));

client.login(TOKEN);
