const { EmbedBuilder, MessageFlags } = require('discord.js');
const { embedToContainer } = require('../utils/embeds');

module.exports = {
    name: 'serverinvite',
    async execute(message) {
        try {
            const invite = await message.channel.createInvite({ maxAge: 0, maxUses: 0, unique: false });
            const embed = new EmbedBuilder()
                .setTitle(`📨 Invitación — ${message.guild.name}`)
                .setColor('#57F287')
                .setThumbnail(message.guild.iconURL({ dynamic: true }))
                .addFields({ name: 'Enlace', value: invite.url })
                .setFooter({ text: 'CPU v2' })
                .setTimestamp();
            await message.author.send({ components: [embedToContainer(embed)], flags: MessageFlags.IsComponentsV2 });
            return message.reply({ content: '✅ Te envié la invitación del servidor por MD.' });
        } catch (error) {
            return message.reply({ content: '❌ No se pudo generar o enviar la invitación. Revisa que tenga el permiso "Crear Invitación" y que tus MD estén abiertos.' });
        }
    }
};
