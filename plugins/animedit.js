const settings = require("../settings");

async function animEditCommand(sock, chatId, message) {
    try {
        const sender = message.key.participant || message.key.remoteJid;
        const botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        const senderClean = sender ? sender.split(':')[0] + '@s.whatsapp.net' : "";

        const isOwner = message.key.fromMe || (senderClean === botNumber);

        const text = message.message?.conversation || 
                     message.message?.extendedTextMessage?.text || 
                     message.message?.imageMessage?.caption || 
                     message.message?.videoMessage?.caption || "";
                     
        const cleanText = text.trim().toLowerCase();

        const sadEmojis = ['😢', '😭', '💔', '🙁', '☹️', '😿', '😾', '🥺', '🥀', '🥲', '😔', '🖤'];
        const happyEmojis = ['😀', '😃', '😄', '😁', '😆', '🥳', '😍', '✨', '🎉', '🤩', '😇', '🌝'];

        let selectedSequence = [];
        let ownerReaction = '😶';

        if (cleanText.includes('sad')) {
            selectedSequence = sadEmojis;
            ownerReaction = '😶';
        } else if (cleanText.includes('happy')) {
            selectedSequence = happyEmojis;
            ownerReaction = '🫣';
        } else {
            return;
        }

        if (!isOwner) {
            await sock.sendMessage(chatId, { react: { text: '😂', key: message.key } });
            await sock.sendMessage(chatId, { text: '_This is an owner command._' }, { quoted: message });
            return;
        }

        await sock.sendMessage(chatId, { react: { text: ownerReaction, key: message.key } });

        const sentMsg = await sock.sendMessage(chatId, { text: selectedSequence[0] }, { quoted: message });

        for (let i = 1; i < selectedSequence.length; i++) {
            await new Promise(resolve => setTimeout(resolve, 700));

            await sock.sendMessage(chatId, {
                text: selectedSequence[i],
                edit: sentMsg.key
            });
        }

    } catch (err) {
        console.error('Animated Edit Error:', err);
    }
}

animEditCommand.command = ['sad', 'happy'];
module.exports = animEditCommand;
