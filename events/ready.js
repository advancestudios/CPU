module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {
        console.log(`🚀 [CPU v2] Núcleo operativo inicializado y activo como ${client.user.tag}`);
    }
};
