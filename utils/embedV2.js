const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    SectionBuilder,
    ThumbnailBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder
} = require('discord.js');

// ================================================
// 🧱 EMBED PERSONALIZADO EN COMPONENTS V2 (para el dashboard)
// Arma el mismo formato que el comando /embed (modals/modal_comando_embed.js):
//   # Título
//   bloques de texto separados por {sp}  →  {sp} = línea separadora
//   -# footer (con línea separadora encima)
// Y suma lo que el dashboard ofrece de más: autor, miniatura, imagen,
// color lateral y fecha.
// ================================================

const MAX_BLOQUES = 12;   // bloques de texto separados por {sp}
const MAX_TEXTO = 4000;   // límite de Discord: texto total de un mensaje Components V2

const esUrl = (u) => typeof u === 'string' && u.length <= 2000 && /^https?:\/\/\S+$/i.test(u);

// Valida y limpia lo que llega desde la página. Devuelve { error } o { datos }.
function normalizarEmbed(raw) {
    if (!raw || typeof raw !== 'object') return { error: 'Falta el contenido del embed.' };

    const campo = (valor, max, nombre) => {
        if (valor === undefined || valor === null || valor === '') return { v: '' };
        if (typeof valor !== 'string') return { e: `El campo "${nombre}" no es válido.` };
        const v = valor.trim();
        if (v.length > max) return { e: `El campo "${nombre}" supera los ${max} caracteres.` };
        return { v };
    };

    const campos = {
        author: campo(raw.author, 256, 'Autor'),
        title: campo(raw.title, 256, 'Título'),
        description: campo(raw.description, 4000, 'Descripción'),
        footer: campo(raw.footer, 2048, 'Footer'),
        thumbnail: campo(raw.thumbnail, 2000, 'Thumbnail'),
        image: campo(raw.image, 2000, 'Imagen')
    };
    for (const c of Object.values(campos)) if (c.e) return { error: c.e };

    const datos = {
        author: campos.author.v,
        title: campos.title.v,
        description: campos.description.v,
        footer: campos.footer.v,
        thumbnail: campos.thumbnail.v,
        image: campos.image.v,
        timestamp: raw.timestamp === true,
        color: Number.isInteger(raw.color) && raw.color >= 0 && raw.color <= 0xFFFFFF ? raw.color : null
    };

    if (!datos.title && !datos.description) return { error: 'El embed necesita al menos un título o una descripción.' };
    if (datos.thumbnail && !esUrl(datos.thumbnail)) return { error: 'La URL del thumbnail no es válida (debe empezar con http:// o https://).' };
    if (datos.image && !esUrl(datos.image)) return { error: 'La URL de la imagen no es válida (debe empezar con http:// o https://).' };

    const bloques = dividirBloques(datos.description);
    if (bloques.length > MAX_BLOQUES) return { error: `Usaste demasiados {sp}: el máximo es ${MAX_BLOQUES} bloques de texto.` };

    return { datos };
}

// Valida los botones de enlace (máx. 5, una sola fila). Devuelve { error } o { botones }.
function normalizarBotones(raw) {
    if (raw === undefined || raw === null) return { botones: [] };
    if (!Array.isArray(raw)) return { error: 'Los botones no tienen un formato válido.' };
    if (raw.length > 5) return { error: 'Máximo 5 botones.' };

    const botones = [];
    for (const b of raw) {
        const label = typeof b?.label === 'string' ? b.label.trim() : '';
        const url = typeof b?.url === 'string' ? b.url.trim() : '';
        if (!label && !url) continue;
        if (!label || !url) return { error: 'Cada botón necesita texto y enlace.' };
        if (label.length > 80) return { error: `El texto del botón "${label.slice(0, 20)}…" supera los 80 caracteres.` };
        if (!esUrl(url)) return { error: `El enlace del botón "${label}" no es válido (debe empezar con http:// o https://).` };
        botones.push({ label, url });
    }
    return { botones };
}

function dividirBloques(descripcion) {
    return descripcion ? descripcion.split('{sp}').map(b => b.trim()).filter(Boolean) : [];
}

const separador = () => new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true);

// Construye el contenedor V2. Devuelve { container, totalTexto }.
function construirContainerV2(d) {
    const container = new ContainerBuilder();
    if (d.color !== null && d.color !== undefined) container.setAccentColor(d.color);

    let totalTexto = 0;
    const texto = (contenido) => {
        totalTexto += contenido.length;
        return new TextDisplayBuilder().setContent(contenido);
    };

    const bloques = dividirBloques(d.description);

    // Encabezado: autor (texto chico) + título (grande). Si hay miniatura, va a su lado.
    const lineas = [];
    if (d.author) lineas.push(`-# ${d.author}`);
    if (d.title) lineas.push(`# ${d.title}`);
    let textoEncabezado = lineas.join('\n');
    let encabezadoEsBloque = false;

    // Sin título ni autor pero con miniatura: el primer bloque acompaña a la miniatura
    if (!textoEncabezado && d.thumbnail && bloques.length) {
        textoEncabezado = bloques.shift();
        encabezadoEsBloque = true;
    }

    if (textoEncabezado) {
        if (d.thumbnail) {
            container.addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(texto(textoEncabezado))
                    .setThumbnailAccessory(new ThumbnailBuilder().setURL(d.thumbnail))
            );
        } else {
            container.addTextDisplayComponents(texto(textoEncabezado));
        }
    }

    // Cuerpo: {sp} pone una línea separadora entre bloques (igual que el comando /embed)
    bloques.forEach((bloque, i) => {
        if (i > 0 || encabezadoEsBloque) container.addSeparatorComponents(separador());
        container.addTextDisplayComponents(texto(bloque));
    });

    if (d.image) {
        container.addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(d.image))
        );
    }

    // Pie: línea separadora + texto chico
    const pie = [];
    if (d.footer) pie.push(d.footer);
    if (d.timestamp) pie.push(`<t:${Math.floor(Date.now() / 1000)}:f>`);
    if (pie.length) {
        container.addSeparatorComponents(separador());
        container.addTextDisplayComponents(texto(`-# ${pie.join(' • ')}`));
    }

    return { container, totalTexto };
}

module.exports = { normalizarEmbed, normalizarBotones, construirContainerV2, MAX_TEXTO };
