const os = require('os');
const fs = require('fs');
const sharp = require('sharp');
const settings = require('../settings.js');

function formatTime(seconds) {
    const days = Math.floor(seconds / (24 * 60 * 60));
    seconds = seconds % (24 * 60 * 60);
    const hours = Math.floor(seconds / (60 * 60));
    seconds = seconds % (60 * 60);
    const minutes = Math.floor(seconds / 60);
    seconds = Math.floor(seconds % 60);

    let time = '';
    if (days > 0) time += `${days}d `;
    if (hours > 0) time += `${hours}h `;
    if (minutes > 0) time += `${minutes}m `;
    if (seconds > 0 || time === '') time += `${seconds}s`;

    return time.trim();
}

async function pingCommand(sock, chatId, message) {
    try {
        const start = Date.now();
        const tempMsg = await sock.sendMessage(chatId, { text: '⚡ *[ ZORO MD ]* _Analyzing server latency..._' }, { quoted: message });
        const end = Date.now();
        const ping = Math.round((end - start) / 2);

        await sock.sendMessage(chatId, { delete: tempMsg.key });

        const uptimeInSeconds = process.uptime();
        const uptimeFormatted = formatTime(uptimeInSeconds);

        const imageUrl = "https://files.catbox.moe/i9hpvp.jpg"; 

        // 🖼️ Sharp വെച്ച് ഇമേജ് ബേസ്64 (Base64) ആക്കി കൺവേർട്ട് ചെയ്യുന്നു (ലോഗോയിൽ പെർഫെക്റ്റ് ആയി വരാൻ)
        let thumbnailBuffer = null;
        let base64Image = '';
        try {
            const response = await fetch(imageUrl);
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            thumbnailBuffer = await sharp(buffer)
                .resize(300, 300, { fit: 'cover', position: 'center' })
                .jpeg({ quality: 90 })
                .toBuffer();
            
            base64Image = thumbnailBuffer.toString('base64');
        } catch (err) {
            console.log('Error processing image with sharp:', err);
        }

        // ============================================
        // 𓇻 CONTACT CARD (vCard) WITH PHOTO ENCODING
        // ============================================
        const vcardName = "𝐀𝐚𝐝𝐡𝐢𝐱𝐝";
        
        // vCard-ൽ ഫോട്ടോ നേരിട്ട് ബേസ്64 ഫോർമാറ്റിൽ നൽകിയാൽ വാട്സാപ്പ് സർക്കിൾ ലോഗോയിൽ ആ ഇമേജ് എടുക്കും
        const vcard = [
            'BEGIN:VCARD',
            'VERSION:3.0',
            `N:;${vcardName};;;`,
            `FN:${vcardName}`,
            base64Image ? `PHOTO;ENCODING=b;TYPE=JPEG:${base64Image}` : '',
            'END:VCARD'
        ].filter(Boolean).join('\n');

        const vcardReply = {
            key: {
                fromMe: false,
                participant: '0@s.whatsapp.net',
                remoteJid: 'status@broadcast'
            },
            message: {
                contactMessage: {
                    displayName: vcardName,
                    vcard: vcard,
                    jpegThumbnail: thumbnailBuffer
                }
            }
        };

        const pingText = `
⚡ *𝙕𝙊𝙍𝙊 𝗠𝗗 SPEED*

🚄 *Latency:* \`${ping}ms\`
📡 *Status:* Online

> 𝘱𝘰𝘸𝘦𝘳𝘦𝘥 𝘣𝘺 𝘢𝘥𝘩𝘪𝘹𝘥 </>`.trim();

        // Send message with quoted contact card and thumbnail
        await sock.sendMessage(chatId, { 
            text: pingText,
            jpegThumbnail: thumbnailBuffer
        }, { quoted: vcardReply });

    } catch (error) {
        console.error('Error in ping command:', error);
        await sock.sendMessage(chatId, { text: '❌ Failed to get bot status.' });
    }
}

module.exports = pingCommand;
