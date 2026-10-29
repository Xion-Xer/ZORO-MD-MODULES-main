const settings = require("../settings");
const os = require('os');
const fs = require('fs');
const path = require('path');

// നീ അയച്ചു തന്ന പുതിയ സിംഗിൾ വീഡിയോ ലിങ്ക് ഇവിടെ അപ്ഡേറ്റ് ചെയ്തിട്ടുണ്ട്
const aliveVideoUrl = "https://files.catbox.moe/g48zuo.mp4";

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

function getEastAfricaTime() {
    const now = new Date();
    const eatOffset = 5.5 * 60;
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const eatTime = new Date(utc + (eatOffset * 60000));
    
    let hours = eatTime.getHours();
    const minutes = eatTime.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    
    return `${hours}:${minutes} ${ampm}`;
}

function getBotMode() {
    try {
        const data = JSON.parse(fs.readFileSync('./data/messageCount.json', 'utf8'));
        return data.isPublic ? '🌐 Public' : '🔒 Private';
    } catch (error) {
        return '🌐 Public';
    }
}

async function aliveCommand(sock, chatId, message) {
    try {
        const start = Date.now();
        const tempMsg = await sock.sendMessage(chatId, { text: '⚡ 𝑪𝒉𝒆𝒄𝒌𝒊𝒏𝒈...' }, { quoted: message });
        const end = Date.now();
        const ping = Math.round((end - start) / 2);
        
        await sock.sendMessage(chatId, { delete: tempMsg.key });
        
        const uptimeInSeconds = process.uptime();
        const uptimeFormatted = formatTime(uptimeInSeconds);
        const currentTime = getEastAfricaTime();
        const botMode = getBotMode();
        const totalMem = (os.totalmem() / (1024 * 1024 * 1024)).toFixed(2);
        const freeMem = (os.freemem() / (1024 * 1024 * 1024)).toFixed(2);
        const usedMem = (totalMem - freeMem).toFixed(2);
        let userName = message.pushName || "Aadhi Xd";

        const aliveMessage = `╭══════════════⊷
┃ ❍ 𝑼𝒔𝒆𝒓 : ${userName}
┃ ❍ 𝑷𝒊𝒏𝒈 : ${ping}ms
┃ ❍ 𝑻𝒊𝒎𝒆 : ${currentTime}
┃ ❍ 𝑼𝒑𝒕𝒊𝒎𝒆 : ${uptimeFormatted}
┃ ❍ 𝑽𝒆𝒓𝒔𝒊𝒐𝒏 : ${settings.version || '3.0.0'}
┃ ❍ 𝑴𝒐𝒅𝒆 : ${botMode}
┃ ❍ 𝑹𝑨𝑴 : ${usedMem}GB / ${totalMem}GB
╰═════════════════⊷
╭══════════════⊷
┃ ❍ 𝒁𝑶𝑹𝑶 𝑿𝑴𝑫 𝒊𝒔 𝒐𝒏𝒍𝒊𝒏𝒆 & 𝒂𝒄𝒕𝒊𝒗𝒆!
╰══════════════⊷
> 📝 𝗧𝘆𝗽𝗲 .𝗺𝗲𝗻𝘂 𝗳𝗼𝗿 𝗰𝗼𝗺𝗺𝗮𝗻𝗱𝘀
> _Crafted by Aadhi.xd乡_`;

        await sock.sendMessage(chatId, {
            video: { url: aliveVideoUrl },
            caption: aliveMessage.trim(),
            mimetype: 'video/mp4',
            ptv: false
        }, { quoted: message });

    } catch (error) {
        console.error('Error in alive command:', error);
        await sock.sendMessage(chatId, { text: '🟢 Bot is alive and running!' }, { quoted: message });
    }
}

module.exports = aliveCommand;
