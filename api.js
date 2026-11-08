const {
    ChannelType,
    PermissionFlagsBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    MessageFlags
} = require('discord.js');
const { normalizarEmbed, normalizarBotones, construirContainerV2, MAX_TEXTO } = require('./utils/embedV2');
const { setGuildConfig, getGuildConfig, obtenerConfig } = require('./utils/config');
const { CREADORES_IDS } = require('./utils/constants');
const { embedToContainer } = require('./utils/embeds');

// ================================================
// 🌐 API DEL DASHBOARD
// Rutas que usa la página web. Todas exigen iniciar sesión con Discord:
//   - se verifica que el token pertenezca a ESTE bot (CLIENT_ID)
//   - y, en las rutas de un servidor, que quien llama sea dueño o administrador de ese servidor
//
//   GET  /guild?guild_id=…   canales, categorías y roles del servidor
//   POST /guilds/available   de una lista de servidores, cuáles tienen al bot (y donde eres admin)
//   POST /send               mensaje normal
//   POST /embed              embed en Components V2 (igual que el comando /embed)
//   GET  /me                 dice si quien inicia sesión es creador del bot (CREADORES_IDS en utils/constants.js)
//   GET  /announce/stats     (solo creadores) a cuántos servidores llegaría un anuncio
//   POST /announce           (solo creadores) envía un anuncio al canal de anuncios de cada servidor
//   POST /tickets/setup | /tickets/panel | /tickets/support-role
//
// Opcional: ALLOWED_ORIGINS=https://tu-sitio.netlify.app  (varias separadas por coma)
// limita qué páginas pueden usar la API. Si no existe, acepta cualquiera.
// ================================================

const TIPOS_TEXTO = [ChannelType.GuildText, ChannelType.GuildAnnouncement];
const ID_VALIDO = /^\d{5,25}$/;

function montarApi(app, client) {
    const CLIENT_ID = process.env.CLIENT_ID;
    const ORIGENES = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);

    // ---------- CORS ----------
    app.use((req, res, next) => {
        const origen = req.headers.origin;
        if (ORIGENES.length === 0) {
            res.header('Access-Control-Allow-Origin', '*');
        } else if (origen && ORIGENES.includes(origen)) {
            res.header('Access-Control-Allow-Origin', origen);
            res.header('Vary', 'Origin');
        }
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.header('Access-Control-Max-Age', '600');
        if (req.method === 'OPTIONS') return res.sendStatus(204);
        next();
    });

    const fail = (res, status, error) => res.status(status).json({ error });
    const seguro = (fn) => (req, res) => Promise.resolve(fn(req, res)).catch(err => {
        console.error(`Error en ${req.method} ${req.path}:`, err);
        if (!res.headersSent) fail(res, 500, 'Error interno del servidor.');
    });

    // ---------- Autenticación ----------
    // token -> { userId, exp }. Se guarda unos minutos para no consultar a Discord en cada petición.
    const tokens = new Map();

    async function userIdDesdeToken(token) {
        const hit = tokens.get(token);
        if (hit && hit.exp > Date.now()) return hit.userId;

        const r = await fetch('https://discord.com/api/v10/oauth2/@me', {
            headers: { Authorization: `Bearer ${token}` },
            signal: AbortSignal.timeout(8000)
        });
        if (r.status === 401 || r.status === 403) return null;
        if (!r.ok) throw new Error(`Discord respondió ${r.status}`);

        const data = await r.json();
        // El token debe haberse emitido para ESTE bot: evita que sirva uno de otra aplicación
        if (!data?.user?.id || data?.application?.id !== CLIENT_ID) return null;

        const vence = data.expires ? Date.parse(data.expires) : Infinity;
        if (tokens.size > 1000) {
            for (const [t, v] of tokens) if (v.exp <= Date.now()) tokens.delete(t);
        }
        tokens.set(token, { userId: data.user.id, exp: Math.min(Date.now() + 5 * 60 * 1000, vence) });
        return data.user.id;
    }

    async function requireAuth(req, res, next) {
        const m = /^Bearer (\S+)$/.exec(req.headers.authorization || '');
        if (!m) return fail(res, 401, 'Debes iniciar sesión con Discord.');
        try {
            const userId = await userIdDesdeToken(m[1]);
            if (!userId) return fail(res, 401, 'Tu sesión expiró o no es válida. Inicia sesión de nuevo.');
            req.userId = userId;
            next();
        } catch (err) {
            console.error('Error verificando el token con Discord:', err.message);
            fail(res, 503, 'No se pudo verificar tu sesión con Discord. Intenta de nuevo.');
        }
    }

    async function puedeAdministrar(guild, userId) {
        if (guild.ownerId === userId) return true;
        const miembro = await guild.members.fetch(userId).catch(() => null);
        return !!miembro && miembro.permissions.has(PermissionFlagsBits.Administrator);
    }

    async function requireGuildAdmin(req, res, next) {
        const guildId = String((req.method === 'GET' ? req.query.guild_id : req.body?.guildId) || '');
        if (!ID_VALIDO.test(guildId)) return fail(res, 400, 'Falta el servidor.');

        const guild = client.guilds.cache.get(guildId);
        if (!guild) return fail(res, 404, 'CPU no está en este servidor.');

        try {
            if (!(await puedeAdministrar(guild, req.userId))) {
                return fail(res, 403, 'Necesitas ser dueño o administrador de este servidor.');
            }
        } catch (err) {
            console.error('Error comprobando permisos:', err);
            return fail(res, 503, 'No se pudieron comprobar tus permisos. Intenta de nuevo.');
        }
        req.guild = guild;
        next();
    }

    const protegido = [requireAuth, requireGuildAdmin];

    // ---------- Utilidades ----------
    const canalTexto = (guild, id) => {
        const canal = typeof id === 'string' ? guild.channels.cache.get(id) : null;
        return canal && TIPOS_TEXTO.includes(canal.type) ? canal : null;
    };

    function falloDiscord(res, err, contexto) {
        if (err?.code === 50013 || err?.code === 50001) {
            return fail(res, 403, 'CPU no tiene permiso para escribir en ese canal.');
        }
        console.error(`Error de Discord (${contexto}):`, err);
        return fail(res, 500, `Discord rechazó la acción: ${String(err?.message || 'error desconocido').slice(0, 200)}`);
    }

    const aHex = (n) => (n ? `#${n.toString(16).padStart(6, '0')}` : null);

    // ---------- Servidores ----------
    app.get('/guild', ...protegido, seguro(async (req, res) => {
        const guild = req.guild;
        const canales = [...guild.channels.cache.values()]
            .filter(c => TIPOS_TEXTO.includes(c.type))
            .map(c => ({ id: c.id, name: c.name, parentId: c.parentId || null, position: c.rawPosition ?? 0 }));
        const categorias = [...guild.channels.cache.values()]
            .filter(c => c.type === ChannelType.GuildCategory)
            .map(c => ({ id: c.id, name: c.name, position: c.rawPosition ?? 0 }));
        const roles = [...guild.roles.cache.values()]
            .filter(r => r.id !== guild.id && !r.managed)
            .sort((a, b) => b.position - a.position)
            .map(r => ({ id: r.id, name: r.name, color: aHex(r.color), position: r.position }));

        res.set('Cache-Control', 'no-store');
        res.json({ id: guild.id, name: guild.name, channels: canales, categories: categorias, roles });
    }));

    // De una lista de IDs de servidor, devuelve solo los que tienen al bot y donde el usuario es admin
    app.post('/guilds/available', requireAuth, seguro(async (req, res) => {
        const ids = Array.isArray(req.body?.ids) ? req.body.ids.filter(id => ID_VALIDO.test(String(id))).slice(0, 200) : null;
        if (!ids) return fail(res, 400, 'Falta la lista de servidores.');

        const conBot = ids.map(String).map(id => client.guilds.cache.get(id)).filter(Boolean);
        const permitidos = await Promise.all(conBot.map(async g => {
            try { return (await puedeAdministrar(g, req.userId)) ? g.id : null; } catch { return null; }
        }));
        res.set('Cache-Control', 'no-store');
        res.json({ ids: permitidos.filter(Boolean) });
    }));

    // ---------- Mensajes ----------
    app.post('/send', ...protegido, seguro(async (req, res) => {
        const content = typeof req.body.content === 'string' ? req.body.content.trim() : '';
        if (!content) return fail(res, 400, 'El mensaje está vacío.');
        if (content.length > 2000) return fail(res, 400, 'El mensaje supera los 2000 caracteres.');

        const canal = canalTexto(req.guild, req.body.channelId);
        if (!canal) return fail(res, 404, 'Ese canal no existe en este servidor.');

        try { await canal.send({ content }); } catch (err) { return falloDiscord(res, err, '/send'); }
        res.json({ success: true });
    }));

    // Arma el mensaje (Components V2 + botones de enlace). Devuelve { error } o { payload }
    function armarEmbed(body) {
        const e = normalizarEmbed(body.embed);
        if (e.error) return { error: e.error };
        const b = normalizarBotones(body.buttons);
        if (b.error) return { error: b.error };

        const { container, totalTexto } = construirContainerV2(e.datos);
        if (totalTexto > MAX_TEXTO) {
            return { error: `El texto total supera el límite de ${MAX_TEXTO} caracteres (tiene ${totalTexto}).` };
        }

        const components = [container];
        if (b.botones.length) {
            components.push(new ActionRowBuilder().addComponents(
                b.botones.map(x => new ButtonBuilder().setLabel(x.label).setStyle(ButtonStyle.Link).setURL(x.url))
            ));
        }
        return { payload: { components, flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } } };
    }

    // Embed en Components V2: mismo formato que el comando /embed de Discord
    app.post('/embed', ...protegido, seguro(async (req, res) => {
        const canal = canalTexto(req.guild, req.body.channelId);
        if (!canal) return fail(res, 404, 'Ese canal no existe en este servidor.');

        const m = armarEmbed(req.body);
        if (m.error) return fail(res, 400, m.error);

        try { await canal.send(m.payload); } catch (err) { return falloDiscord(res, err, '/embed'); }
        res.json({ success: true });
    }));

    // ---------- Solo creadores del bot ----------
    const esCreador = (id) => CREADORES_IDS.includes(id);
    const soloCreadores = (req, res, next) =>
        esCreador(req.userId) ? next() : fail(res, 403, 'Solo los creadores del bot pueden usar esto.');

    // La página lo consulta para saber si muestra la sección "Anuncios" (el permiso real se vuelve a comprobar en cada ruta)
    app.get('/me', requireAuth, (req, res) => {
        res.set('Cache-Control', 'no-store');
        res.json({ creator: esCreador(req.userId) });
    });

    // Servidores que configuraron su canal de anuncios con /setup anuncios
    function destinosAnuncios() {
        const cfg = obtenerConfig();
        const destinos = [];
        for (const guild of client.guilds.cache.values()) {
            const entrada = cfg[guild.id];
            const canalId = entrada && typeof entrada === 'object' ? entrada.anunciosCanal : null;
            if (canalId) destinos.push({ guild, canalId });
        }
        return destinos;
    }

    app.get('/announce/stats', requireAuth, soloCreadores, (req, res) => {
        res.set('Cache-Control', 'no-store');
        res.json({ configurados: destinosAnuncios().length, total: client.guilds.cache.size });
    });

    const pausa = (ms) => new Promise(r => setTimeout(r, ms));
    let anunciando = false;

    // body: { embed, buttons, test?: { guildId, channelId } }
    //   con "test": solo se envía a ese canal (para probar cómo se ve)
    //   sin "test": se envía al canal de anuncios de cada servidor que lo configuró
    app.post('/announce', requireAuth, soloCreadores, seguro(async (req, res) => {
        const m = armarEmbed(req.body);
        if (m.error) return fail(res, 400, m.error);

        if (req.body.test) {
            const guild = client.guilds.cache.get(String(req.body.test.guildId || ''));
            const canal = guild && canalTexto(guild, req.body.test.channelId);
            if (!canal) return fail(res, 404, 'Ese canal no existe.');
            try { await canal.send(m.payload); } catch (err) { return falloDiscord(res, err, '/announce (prueba)'); }
            return res.json({ success: true, enviados: 1, fallidos: [] });
        }

        if (anunciando) return fail(res, 409, 'Ya hay un anuncio enviándose. Espera a que termine.');
        const destinos = destinosAnuncios();
        if (!destinos.length) return fail(res, 400, 'Ningún servidor ha configurado su canal de anuncios (/setup anuncios).');

        anunciando = true;
        let enviados = 0;
        const fallidos = [];
        try {
            for (const { guild, canalId } of destinos) {
                const canal = canalTexto(guild, canalId);
                if (!canal) { fallidos.push({ servidor: guild.name, motivo: 'el canal configurado ya no existe' }); continue; }
                const permisos = canal.permissionsFor(guild.members.me);
                if (!permisos || !permisos.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages])) {
                    fallidos.push({ servidor: guild.name, motivo: 'CPU no puede escribir en ese canal' }); continue;
                }
                try { await canal.send(m.payload); enviados++; }
                catch (err) { fallidos.push({ servidor: guild.name, motivo: String(err?.message || 'error').slice(0, 100) }); }
                await pausa(600); // para no chocar con los límites de Discord
            }
        } finally { anunciando = false; }

        console.log(`📣 Anuncio enviado por ${req.userId}: ${enviados} ok, ${fallidos.length} fallidos`);
        res.json({ success: true, enviados, fallidos, total: destinos.length });
    }));

    // ---------- Tickets (equivalen a /setup tickets, /setup-panel-tickets y /setup-rol-soporte) ----------
    app.post('/tickets/setup', ...protegido, seguro(async (req, res) => {
        const categoria = typeof req.body.categoryId === 'string' ? req.guild.channels.cache.get(req.body.categoryId) : null;
        if (!categoria || categoria.type !== ChannelType.GuildCategory) return fail(res, 404, 'Esa categoría no existe en este servidor.');
        setGuildConfig(req.guild.id, { ticketsCategory: categoria.id });
        res.json({ success: true });
    }));

    app.post('/tickets/panel', ...protegido, seguro(async (req, res) => {
        const canal = canalTexto(req.guild, req.body.channelId);
        if (!canal) return fail(res, 404, 'Ese canal no existe en este servidor.');
        if (!getGuildConfig(req.guild.id).ticketsCategory) {
            return fail(res, 400, 'Primero guarda la categoría de tickets (/setup tickets).');
        }

        const embedPanel = new EmbedBuilder()
            .setTitle('🎫 Soporte al Miembro')
            .setDescription('¿Necesitas ayuda o tienes una duda? Presiona el botón para abrir un ticket privado con el Staff.')
            .setFooter({ text: 'CPU v2' })
            .setTimestamp();
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('abrir_ticket').setLabel('Abrir Ticket').setEmoji('🎫').setStyle(ButtonStyle.Primary)
        );

        try {
            await canal.send({ components: [embedToContainer(embedPanel), row], flags: MessageFlags.IsComponentsV2 });
        } catch (err) { return falloDiscord(res, err, '/tickets/panel'); }
        res.json({ success: true });
    }));

    app.post('/tickets/support-role', ...protegido, seguro(async (req, res) => {
        const rol = typeof req.body.roleId === 'string' ? req.guild.roles.cache.get(req.body.roleId) : null;
        if (!rol || rol.id === req.guild.id) return fail(res, 404, 'Ese rol no existe en este servidor.');
        setGuildConfig(req.guild.id, { ticketsRole: rol.id });
        res.json({ success: true });
    }));
}

module.exports = { montarApi };
