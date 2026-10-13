const yts = require('yt-search');
const yt = require('@vreden/youtube_scraper');

async function videoCommand(sock, chatId, message) {
    try {
        const fullText = message.message?.conversation || 
                         message.message?.extendedTextMessage?.text || 
                         message.message?.imageMessage?.caption || '';
        
        // Extract video query
        const text = fullText.split(' ').slice(1).join(' ').trim();
        
        if (!text) {
            return await sock.sendMessage(chatId, { 
                text: 'âŒ *Error:* Please provide a video name!\nðŸ’¡ *Example:* `.video Oh My Sweety`' 
            }, { quoted: message });
        }

        // Send processing reaction
        await sock.sendMessage(chatId, { react: { text: "â³", key: message.key } });

        // Search YouTube
        const searchResults = await yts(text);
        const videos = searchResults?.videos;
        
        if (!videos || videos.length === 0) {
            return await sock.sendMessage(chatId, { text: "âŒ *Oops!* No videos found matching your query." }, { quoted: message });
        }
        
        const video = videos[0];

        // Fetch 1080p video download link using @vreden/youtube_scraper
        let res = await yt.ytmp4(video.url, 1080);
        
        if (!res || !res.status || !res.download?.url) {
            // Fallback to 720p if 1080p is not available
            const fallbackRes = await yt.ytmp4(video.url, 720);
            if (!fallbackRes || !fallbackRes.status || !fallbackRes.download?.url) {
                return await sock.sendMessage(chatId, { text: "âŒ Video download failed from server!" }, { quoted: message });
            }
            res = fallbackRes;
        }

        const dlUrl = res.download.url;

        // Send video directly via URL
        await sock.sendMessage(chatId, {
            video: { url: dlUrl },
            mimetype: 'video/mp4',
            fileName: `${video.title}.mp4`,
            caption: `ðŸŽ¥ *${video.title}*`
        }, { quoted: message });

        // Send clean completion text message in italic style without unneeded emojis
        await sock.sendMessage(chatId, { 
            text: '_Zoro download completed._' 
        }, { quoted: message });

        // Send success reaction
        await sock.sendMessage(chatId, { react: { text: "ðŸ“¥", key: message.key } });

    } catch (err) {
        console.error('Zoro MD Video Error:', err);
        try {
            await sock.sendMessage(chatId, { text: `âŒ *Error:* Could not process this video request.` }, { quoted: message });
        } catch (secondaryErr) {}
    }
}

videoCommand.command = ['video', 'mp4', 'ytmp4'];
videoCommand.description = 'Download YouTube videos in 1080p format without thumbnail card';

module.exports = videoCommand;
