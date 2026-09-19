module.exports = {
    name: 'ping',
    async execute(message) {
        const inicio = Date.now();
        const msg = await message.reply({ content: '🏓 Calculando...' });
        const latencia = Date.now() - inicio;
        return msg.edit({ content: `🏓 **Pong!**\n📡 Latencia: \`${latencia}ms\`\n💓 WebSocket: \`${message.client.ws.ping}ms\`` });
    }
};
