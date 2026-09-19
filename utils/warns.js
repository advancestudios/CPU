// Los warns se guardan con llave "guildId-userId" para que no se mezclen entre distintos servidores
function warnKey(guildId, userId) {
    return `${guildId}-${userId}`;
}

module.exports = { warnKey };
