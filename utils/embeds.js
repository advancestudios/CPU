const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    SectionBuilder,
    ThumbnailBuilder,
    EmbedBuilder
} = require('discord.js');

// ================================================
// 🎨 CONVERSOR A COMPONENTS V2
// Toma cualquier embed ya armado (título, color, avatar, campos, footer)
// y lo transforma al formato nuevo con divisores, para que se vea más
// elegante. El código que arma cada embed no cambia, solo cómo se envía.
// ================================================
function embedToContainer(embed) {
    const data = embed.data || {};
    const container = new ContainerBuilder();
    if (typeof data.color === 'number') container.setAccentColor(data.color);

    const partes = [];
    if (data.title) partes.push(`## ${data.title}`);
    if (data.description) partes.push(data.description);
    const textoTitulo = new TextDisplayBuilder().setContent(partes.join('\n') || '\u200b');

    if (data.thumbnail && data.thumbnail.url) {
        container.addSectionComponents(
            new SectionBuilder()
                .addTextDisplayComponents(textoTitulo)
                .setThumbnailAccessory(new ThumbnailBuilder().setURL(data.thumbnail.url))
        );
    } else {
        container.addTextDisplayComponents(textoTitulo);
    }

    if (data.fields && data.fields.length) {
        container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
        const textoCampos = data.fields.map(f => `**${f.name}**\n${f.value}`).join('\n\n');
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(textoCampos));
    }

    if (data.footer && data.footer.text) {
        container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false));
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# ${data.footer.text}`));
    }

    return container;
}

// Construye el embed base del ticket (se usa tanto al crearlo como al reclamarlo)
function construirEmbedTicket(nombreUsuario, atendidoPor) {
    return new EmbedBuilder()
        .setTitle('🎫 Ticket de Soporte')
        .setColor('#5865F2')
        .addFields(
            { name: 'Usuario', value: `${nombreUsuario}`, inline: true },
            { name: 'Atendido por', value: atendidoPor || 'Nadie aún', inline: true },
            { name: 'Instrucciones', value: 'Describe tu duda o problema con detalle. El Staff te atenderá en breve.', inline: false }
        )
        .setFooter({ text: 'CPU v2' })
        .setTimestamp();
}

// Envía una copia del embed de una sanción/moderación al canal configurado con /setup mod-actions
async function logModeracion(guild, embed, components = []) {
    const { getGuildConfig } = require('./config');
    const { MessageFlags } = require('discord.js');
    const cfg = getGuildConfig(guild.id);
    if (!cfg.modActions) return;
    const canal = guild.channels.cache.get(cfg.modActions);
    if (!canal) return;
    try { await canal.send({ components: [embedToContainer(embed), ...components], flags: MessageFlags.IsComponentsV2 }); } catch (e) { /* canal borrado o sin permisos, se ignora */ }
}

module.exports = { embedToContainer, construirEmbedTicket, logModeracion };
