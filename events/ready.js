module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {
        console.log(`🚀 CPU Núcleo operativo inicializado y activo como ${client.user.tag}`);
    }
};
