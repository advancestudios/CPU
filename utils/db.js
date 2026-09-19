const mongoose = require('mongoose');

const ServerSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    settings: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} }
});

const WarnSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true }, // guildId-userId
    warns: [
        {
            moderador: String,
            razon: String,
            fecha: String
        }
    ]
});

const ServerModel = mongoose.model('Server', ServerSchema);
const WarnModel = mongoose.model('Warn', WarnSchema);

global.botCache = new Map();

function conectarMongo() {
    mongoose.connect(process.env.MONGO_URI)
        .then(async () => {
            console.log('🟢 [MongoDB] Conectado exitosamente a Atlas.');

            const todosLosServidores = await ServerModel.find({});
            todosLosServidores.forEach(srv => {
                global.botCache.set(srv.guildId, srv.settings);
            });
            console.log(`📦 [Cache] Se han cargado las configuraciones de ${todosLosServidores.length} servidores.`);
        })
        .catch(err => console.error('🔴 [MongoDB] Error crítico al conectar:', err));
}

global.getSetting = (guildId, key, defaultValue = null) => {
    const srvSettings = global.botCache.get(guildId);
    if (!srvSettings) return defaultValue;
    const value = srvSettings instanceof Map ? srvSettings.get(key) : srvSettings[key];
    return value !== undefined ? value : defaultValue;
};

global.setSetting = async (guildId, key, value) => {
    if (!global.botCache.has(guildId)) {
        global.botCache.set(guildId, new Map());
    }
    const srvSettings = global.botCache.get(guildId);
    if (srvSettings instanceof Map) {
        srvSettings.set(key, value);
    } else {
        srvSettings[key] = value;
    }

    try {
        await ServerModel.findOneAndUpdate(
            { guildId: guildId },
            { $set: { [`settings.${key}`]: value } },
            { upsert: true }
        );
    } catch (error) {
        console.error(`🔴 Error al guardar configuración (${key}) en MongoDB para el servidor ${guildId}:`, error);
    }
};

module.exports = { conectarMongo, ServerModel, WarnModel };
