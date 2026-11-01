// Sticker to Image Plugin (.sti) for ZORO-MD
const { downloadMediaMessage } = require('@aadhixd777/baileys');
const fs = require('fs');
const { exec } = require('child_process');

async function stiCommand(sock, chatId, message) {
    try {
        const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quoted || !quoted.stickerMessage) {
            return await sock.sendMessage(chatId, { 
                text: '❌ *Error:* Please reply to any sticker with `.sti` to convert it into an image!' 
            }, { quoted: message });
        }

        await sock.sendMessage(chatId, { react: { text: "⏳", key: message.key } });

        const stream = await downloadMediaMessage(
            { message: quoted },
            'buffer',
            {},
            { logger: console }
        );

        const inputPath = `./downloads/${Date.now()}.webp`;
        const outputPath = `./downloads/${Date.now()}.png`;

        if (!fs.existsSync('./downloads')) {
            fs.mkdirSync('./downloads', { recursive: true });
        }

        fs.writeFileSync(inputPath, stream);

        exec(`ffmpeg -i ${inputPath} ${outputPath}`, async (err) => {
            try { fs.unlinkSync(inputPath); } catch(e){}

            if (err || !fs.existsSync(outputPath)) {
                await sock.sendMessage(chatId, { react: { text: "❌", key: message.key } });
                return await sock.sendMessage(chatId, { text: '❌ Failed to convert sticker to image!' }, { quoted: message });
            }

            await sock.sendMessage(chatId, {
                image: fs.readFileSync(outputPath),
                caption: '✨ *Converted by ZORO-MD*'
            }, { quoted: message });

            await sock.sendMessage(chatId, { react: { text: "✅", key: message.key } });
            try { fs.unlinkSync(outputPath); } catch(e){}
        });

    } catch (err) {
        console.error('STI Error:', err);
        await sock.sendMessage(chatId, { text: '❌ Error processing sticker.' }, { quoted: message });
    }
}

module.exports = stiCommand;
