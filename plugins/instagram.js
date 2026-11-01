// Instagram Downloader Plugin for ZORO-MD (Clean & Custom Channel)
const axios = require('axios');
const { igdl } = require('ruhend-scraper');

const processedMessages = new Set();

async function instagramCommand(sock, chatId, message) {
    try {
        if (processedMessages.has(message.key.id)) return;
        processedMessages.add(message.key.id);
        setTimeout(() => processedMessages.delete(message.key.id), 5 * 60 * 1000);

        const fullText = message.message?.conversation || 
                         message.message?.extendedTextMessage?.text || 
                         message.message?.imageMessage?.caption || 
                         message.message?.videoMessage?.caption || '';
                         
        const args = fullText.trim().split(/\s+/).slice(1);
        const urlInput = args[0] || fullText;

        const instagramPattern = /https?:\/\/(?:www\.)?(?:instagram\.com|instagr\.am)\/(?:p|reel|reels|tv|share)\/([A-Za-z0-9_-]+)/i;
        const match = urlInput.match(instagramPattern);

        if (!match) {
            return await sock.sendMessage(chatId, { 
                text: "⭐ *ZORO-MD INSTAGRAM* ⭐\n\n❌ Please provide a valid Instagram link!\n💡 Example: .ig https://www.instagram.com/reel/Cxxxxxx/"
            }, { quoted: message });
        }

        try { await sock.sendMessage(chatId, { react: { text: '🔄', key: message.key } }); } catch (e) {}

        const igUrl = match[0];
        let mediaUrl = null;

        // Method 1: Try xenosirapis API
        try {
            const apiUrl = `https://xenosirapis.zone.id/api/igdl?url=${encodeURIComponent(igUrl)}`;
            const response = await axios.get(apiUrl, { timeout: 15000 });
            if (response.data && response.data.success) {
                mediaUrl = response.data.download || response.data.result || response.data.data;
            }
        } catch (e) {}

        // Method 2: Fallback to ruhend-scraper
        if (!mediaUrl) {
            try {
                const res = await igdl(igUrl);
                if (res && res.data && res.data.length > 0) {
                    mediaUrl = res.data[0].url;
                }
            } catch (e) {}
        }

        if (!mediaUrl) {
            try { await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } }); } catch (e) {}
            return await sock.sendMessage(chatId, { 
                text: "❌ Could not fetch media. Please check the link or try again later."
            }, { quoted: message });
        }

        // Send video directly via URL with your custom channel info
        await sock.sendMessage(chatId, {
            video: { url: mediaUrl },
            mimetype: "video/mp4",
            caption: "𝗗𝗢𝗪𝗡𝗟𝗢𝗔𝗗𝗘𝗗 𝗕𝗬 𝗭𝗢𝗥𝗢 𝗠𝗗 🔥",
            contextInfo: {
                forwardingScore: 1,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '0029Vb7pgsF4tRrkS5CECe24@newsletter', 
                    newsletterName: '𝚉𝙾𝚁𝙾 𝙼𝙳 𝙾𝙵𝙵𝙸𝙲𝙸𝙰𝙻'
                }
            }
        }, { quoted: message });

        try { await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } }); } catch (e) {}

    } catch (error) {
        try { await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } }); } catch (e) {}
        await sock.sendMessage(chatId, { 
            text: "❌ An error occurred while processing the Instagram video."
        }, { quoted: message });
    }
}

instagramCommand.command = ['ig', 'insta', 'igdl', 'reel'];
instagramCommand.description = 'Download Instagram Reels / Videos';

module.exports = instagramCommand;
