const fs = require('fs');
const path = require('path');
const { PermissionFlagsBits } = require('discord.js');
const { CREADORES_IDS } = require('./constants');

const ARCHIVO_CONFIG = path.join(__dirname, '..', 'config.json');

if (!fs.existsSync(ARCHIVO_CONFIG)) fs.writeFileSync(ARCHIVO_CONFIG, JSON.stringify({}), 'utf8');

function obtenerConfig() {
    try { return JSON.parse(fs.readFileSync(ARCHIVO_CONFIG, 'utf8')); } catch { return {}; }
}

function guardarConfig(data) {
    fs.writeFileSync(ARCHIVO_CONFIG, JSON.stringify(data, null, 2), 'utf8');
}

// Config por servidor (objeto con varias claves: postulaciones, modActions, ticketsCategory, ticketsRole, staffRole, apelacionLink)
// Compatible con el formato viejo, donde config[guildId] era directamente el ID del canal de postulaciones.
function getGuildConfig(guildId) {
    const config = obtenerConfig();
    let entry = config[guildId];
    if (!entry || typeof entry === 'string') {
        entry = { postulaciones: entry || null };
    }
    return entry;
}

function setGuildConfig(guildId, updates) {
    const config = obtenerConfig();
    let entry = config[guildId];
    if (!entry || typeof entry === 'string') {
        entry = { postulaciones: entry || null };
    }
    config[guildId] = { ...entry, ...updates };
    guardarConfig(config);
    return config[guildId];
}

function esMiembroStaff(member, guildId) {
    if (CREADORES_IDS.includes(member.id)) return true;
    if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
    const cfg = getGuildConfig(guildId);
    if (cfg.staffRole && member.roles.cache.has(cfg.staffRole)) return true;
    return false;
}

module.exports = { obtenerConfig, guardarConfig, getGuildConfig, setGuildConfig, esMiembroStaff };
