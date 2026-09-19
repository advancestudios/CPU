const { EmbedBuilder, MessageFlags } = require('discord.js');
const { embedToContainer } = require('../utils/embeds');
const { BOT_INVITE_PERMISSIONS } = require('../utils/constants');

module.exports = {
    name: 'botinvite',
    async execute(message) {
        const CLIENT_ID = process.env.CLIENT_ID;
        const inviteURL = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&permissions=${BOT_INVITE_PERMISSIONS}&scope=bot%20applications.commands`;
        const embed = new EmbedBuilder()
            .setTitle('🤖 Invitar a CPU v2')
            .setColor('#5865F2')
            .setThumbnail(message.client.user.displayAvatarURL())
            .addFields({ name: 'Enlace', value: `[Invitar Bot](${inviteURL})` })
            .setFooter({ text: 'CPU v2' })
            .setTimestamp();
        return message.reply({ components: [embedToContainer(embed)], flags: MessageFlags.IsComponentsV2 });
    }
};
