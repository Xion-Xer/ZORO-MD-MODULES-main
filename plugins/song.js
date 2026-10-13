const yts = require('yt-search');
const axios = require('axios');
const yt = require('@vreden/youtube_scraper');

// Function to convert text to the specified bold sans font style while preserving capitalization
function applyCustomFont(text) {
    return text.replace(/[A-Za-z0-9]/g, c => {
        const code = c.charCodeAt(0);
        if (code >= 48 && code <= 57) return String.fromCodePoint(code + 0x1D7EC - 48); // Numbers
        const c_offset = c <= 'Z' ? 0x1D56C : 0x1D586; // Uppercase and Lowercase letters
        return String.fromCodePoint(code - (c <= 'Z' ? 65 : 97) + c_offset);
    });
}

async function songCommand(sock, chatId, message) {
    try {
        const fullText = message.message?.conversation || 
                         message.message?.extendedTextMessage?.text || 
                         message.message?.imageMessage?.caption || '';
        
        // Extract song query
        const text = fullText.split(' ').slice(1).join(' ').trim();
        
        if (!text) {
            return await sock.sendMessage(chatId, { 
                text: 'âŒ *Error:* Please provide a song name!\nðŸ’¡ *Example:* `.song Oh My Sweety`' 
            }, { quoted: message });
        }

        // Send processing reaction
        await sock.sendMessage(chatId, { react: { text: "â³", key: message.key } });

        // Search YouTube
        const searchResults = await yts(text);
        const videos = searchResults?.videos;
        
        if (!videos || videos.length === 0) {
            return await sock.sendMessage(chatId, { text: "âŒ *Oops!* No songs found matching your query." }, { quoted: message });
        }
        
        const video = videos[0];

        // Apply custom font while preserving sentence case & capitalization
        const styledTitle = applyCustomFont(video.title);
        const styledChannel = applyCustomFont(video.author.name);

        // Styled caption format
        const captionText = 
`â•­â”€â”€â”€â”€â”€â”€â”€ã€” ð™ðŽð‘ðŽ ðƒðŽð–ðð‹ðŽð€ðƒð„ð‘ ã€•â”€â”€â”€â”€â”€â”€â”€
â”œ ðŸŽ¬ ð—§ð—¶ð˜ð—¹ð—²: ${styledTitle}
â”œ ðŸ“º ð—–ð—µð—®ð—»ð—»ð—²ð—¹: ${styledChannel}
â”œ â° ð——ð˜‚ð—¿ð—®ð˜ð—¶ð—¼ð—»: ${video.timestamp}
â”œ ðŸ‘ï¸ ð—©ð—¶ð—²ð˜„ð˜€: ${video.views.toLocaleString()}
â•°â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€`;

        // Send thumbnail card message
        await sock.sendMessage(chatId, { 
            image: { url: video.thumbnail }, 
            caption: captionText 
        }, { quoted: message });

        // Fetch thumbnail image buffer for audio preview
        const thumbRes = await axios.get(video.thumbnail, { responseType: 'arraybuffer' });
        const thumbBuffer = Buffer.from(thumbRes.data);

        // Fetch audio link using @vreden/youtube_scraper
        const res = await yt.ytmp3(video.url, 128);
        
        if (!res || !res.status || !res.download?.url) {
            return await sock.sendMessage(chatId, { text: "âŒ Audio download failed from server!" }, { quoted: message });
        }

        const dlUrl = res.download.url;

        // Download audio stream as buffer
        const audioRes = await axios.get(dlUrl, { responseType: 'arraybuffer', timeout: 90000 });
        const audioBuffer = Buffer.from(audioRes.data);

        // Send audio message with embedded video thumbnail
        await sock.sendMessage(chatId, {
            audio: audioBuffer,
            mimetype: 'audio/mpeg',
            fileName: `${video.title}.mp3`,
            ptt: false,
            contextInfo: {
                externalAdReply: {
                    title: video.title,
                    body: `Duration: ${video.timestamp}`,
                    mediaType: 1,
                    renderLargerThumbnail: true,
                    thumbnail: thumbBuffer,
                    sourceUrl: 'https://whatsapp.com/channel/0029Vb7pgsF4tRrkS5CECe24'
                }
            }
        }, { quoted: message });

        // Send success reaction
        await sock.sendMessage(chatId, { react: { text: "ðŸŽ§", key: message.key } });

    } catch (err) {
        console.error('Zoro MD Song Error:', err);
        try {
            await sock.sendMessage(chatId, { text: `âŒ *Error:* Could not process this request.` }, { quoted: message });
        } catch (secondaryErr) {}
    }
}

module.exports = songCommand;
