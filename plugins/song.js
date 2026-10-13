const yts = require('yt-search');
const axios = require('axios');
const yt = require('@vreden/youtube_scraper');

// Function to convert text to Title Case and apply Mathematical Bold font style
function applyCustomFont(text) {
    const titleCaseText = text.replace(/\w\S*/g, (txt) => 
        txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );

    return titleCaseText.replace(/[A-Za-z0-9]/g, c => {
        const code = c.charCodeAt(0);
        if (code >= 48 && code <= 57) return String.fromCodePoint(code + 0x1D7CE - 48); // Bold Numbers (0-9)
        const c_offset = c <= 'Z' ? 0x1D400 : 0x1D41A; // Mathematical Bold Uppercase & Lowercase
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
                text: '❌ *Error:* Please provide a song name!\n💡 *Example:* `.song Oh My Sweety`' 
            }, { quoted: message });
        }

        // Send processing reaction
        await sock.sendMessage(chatId, { react: { text: "⏳", key: message.key } });

        // Search YouTube
        const searchResults = await yts(text);
        const videos = searchResults?.videos;
        
        if (!videos || videos.length === 0) {
            return await sock.sendMessage(chatId, { text: "❌ *Oops!* No songs found matching your query." }, { quoted: message });
        }
        
        const video = videos[0];

        // Apply custom Title Case font styling
        const styledTitle = applyCustomFont(video.title);
        const styledChannel = applyCustomFont(video.author.name);

        // Styled caption format
        const captionText = 
`╭───────〔 𝐙𝐎𝐑𝐎 𝐃𝐎𝐖𝐍𝐋𝐎𝐀𝐃𝐄𝐑 〕───────
├ 🎬 𝗧𝗶𝘁𝗹𝗲: ${styledTitle}
├ 📺 𝗖𝗵𝗮𝗻𝗻𝗲𝗹: ${styledChannel}
├ ⏰ 𝗗𝘂𝗿𝗮𝘁𝗶𝗼𝗻: ${video.timestamp}
├ 👁️ 𝗩𝗶𝗲𝘄𝘀: ${video.views.toLocaleString()}
╰─────────────────────────`;

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
            return await sock.sendMessage(chatId, { text: "❌ Audio download failed from server!" }, { quoted: message });
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
        await sock.sendMessage(chatId, { react: { text: "🎧", key: message.key } });

    } catch (err) {
        console.error('Zoro MD Song Error:', err);
        try {
            await sock.sendMessage(chatId, { text: `❌ *Error:* Could not process this request.` }, { quoted: message });
        } catch (secondaryErr) {}
    }
}

module.exports = songCommand;
