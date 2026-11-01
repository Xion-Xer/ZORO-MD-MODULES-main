// Media/Voice/Video to MP3 Converter Plugin (.m4a) for ZORO-MD
const { downloadMediaMessage } = require('@aadhixd777/baileys');
const fs = require('fs');
const { exec } = require('child_process');

async function m4aCommand(sock, chatId, message) {
    try {
        const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        
        // Check if quoted message is video, audio, or voice note (ptt)
        if (!quoted || (!quoted.videoMessage && !quoted.audioMessage)) {
            return await sock.sendMessage(chatId, { 
                text: '❌ *Error:* Please reply to any video, voice note, or audio with `.m4a` to convert it to MP3!' 
            }, { quoted: message });
        }

        await sock.sendMessage(chatId, { react: { text: "⏳", key: message.key } });

        const stream = await downloadMediaMessage(
            { message: quoted },
            'buffer',
            {},
            { logger: console }
        );

        // Determine input file extension based on media type
        const ext = quoted.videoMessage ? 'mp4' : 'ogg';
        const inputPath = `./downloads/${Date.now()}.${ext}`;
        const outputPath = `./downloads/${Date.now()}.mp3`;

        if (!fs.existsSync('./downloads')) {
            fs.mkdirSync('./downloads', { recursive: true });
        }

        fs.writeFileSync(inputPath, stream);

        // Convert input media to standard MP3 using ffmpeg
        exec(`ffmpeg -i ${inputPath} -vn -ab 128k -ar 44100 -y ${outputPath}`, async (err) => {
            try { fs.unlinkSync(inputPath); } catch(e){}

            if (err || !fs.existsSync(outputPath)) {
                await sock.sendMessage(chatId, { react: { text: "❌", key: message.key } });
                return await sock.sendMessage(chatId, { text: '❌ Failed to convert media to MP3!' }, { quoted: message });
            }

            // Send as normal playble audio file
            await sock.sendMessage(chatId, {
                audio: fs.readFileSync(outputPath),
                mimetype: 'audio/mpeg',
                ptt: false
            }, { quoted: message });

            await sock.sendMessage(chatId, { react: { text: "🎧", key: message.key } });
            try { fs.unlinkSync(outputPath); } catch(e){}
        });

    } catch (err) {
        console.error('M4A Converter Error:', err);
        await sock.sendMessage(chatId, { text: '❌ Error processing conversion.' }, { quoted: message });
    }
}

module.exports = m4aCommand;
