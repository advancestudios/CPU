module.exports = {
    name: 'messageCreate',
    async execute(message, client) {
        if (message.author.bot) return;
        if (!message.guild) return;
        if (!message.content.startsWith(client.PREFIX)) return;

        const args = message.content.slice(client.PREFIX.length).trim().split(/\s+/);
        const nombreComando = args.shift().toLowerCase();

        const comando = client.prefixCommands.get(nombreComando);
        if (!comando) return;

        try {
            await comando.execute(message, args);
        } catch (error) {
            console.error(`Error al ejecutar ;${nombreComando}:`, error);
            message.reply({ content: '❌ Ocurrió un error inesperado al ejecutar este comando.' }).catch(() => {});
        }
    }
};
