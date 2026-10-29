const settings = require('../settings');
const fs = require('fs');
const path = require('path');
const os = require('os');
const sharp = require('sharp');
const axios = require('axios');

// Stylish font helper map matching your exact font style
const fontMap = {
    'a': '𝐀', 'b': '𝐁', 'c': '𝐂', 'd': '𝐃', 'e': '𝐄', 'f': '𝐅', 'g': '𝐆', 'h': '𝐇', 'i': '𝐈', 'j': '𝐉', 'k': '𝐊', 'l': '𝐋', 'm': '𝐌', 'n': '𝐍', 'o': '𝐎', 'p': '𝐏', 'q': '𝐐', 'r': '𝐑', 's': '𝐒', 't': '𝐓', 'u': '𝐔', 'v': '𝐕', 'w': '𝐖', 'x': '𝐗', 'y': '𝐘', 'z': '𝐙',
    'A': '𝐀', 'B': '𝐁', 'C': '𝐂', 'D': '𝐃', 'E': '𝐄', 'F': '𝐅', 'G': '𝐆', 'H': '𝐇', 'I': '𝐈', 'J': '𝐉', 'K': '𝐊', 'L': '𝐋', 'M': '𝐌', 'N': '𝐍', 'O': '𝐎', 'P': '𝐏', 'Q': '𝐐', 'R': '𝐑', 'S': '𝐒', 'T': '𝐓', 'U': '𝐔', 'V': '𝐕', 'W': '𝐖', 'X': '𝐗', 'Y': '𝐘', 'Z': '𝐙'
};

function toStylishFont(str) {
    return str.split('').map(char => fontMap[char] || char).join('');
}

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

function getEastAfricaDate() {
    const now = new Date();
    const eatOffset = 5.5 * 60;
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const eatTime = new Date(utc + (eatOffset * 60000));
    
    const day = eatTime.getDate().toString().padStart(2, '0');
    const month = (eatTime.getMonth() + 1).toString().padStart(2, '0');
    const year = eatTime.getFullYear();
    
    return `${day}/${month}/${year}`;
}

async function helpCommand(sock, chatId, message) {
    const start = Date.now();
    const ping = Math.round((Date.now() - start) / 2);

    const uptimeInSeconds = process.uptime();
    const uptimeFormatted = formatTime(uptimeInSeconds);
    
    const currentDate = getEastAfricaDate();
    let userName = message.pushName || "Aadhi Xd";
    
    const vcardImageUrl = "https://files.catbox.moe/5tnppp.jpg";
    const menuImageUrl = "https://files.catbox.moe/ib9hd4.jpg";

    let thumbnailBuffer = null;
    let base64Image = '';
    try {
        const response = await fetch(vcardImageUrl);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        thumbnailBuffer = await sharp(buffer)
            .resize(300, 300, { fit: 'cover', position: 'center' })
            .flatten({ background: { r: 255, g: 255, b: 255 } }) 
            .jpeg({ quality: 100 })
            .toBuffer();
        
        base64Image = thumbnailBuffer.toString('base64');
    } catch (err) {
        console.log('Error processing image with sharp:', err);
    }

    const vcardName = "Aadhi Xd";
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

    const readMoreKey = '\u200b'.repeat(4000);

    const helpMessage = `╭══════════════⊷
┃ ❍ 𝐔𝐬𝐞𝐫 : ${userName}
┃ ❍ 𝐏𝐢𝐧𝐠 : ${ping}ms
┃ ❍ 𝐃𝐚𝐭𝐞 : ${currentDate}
┃ ❍ 𝐔𝐩𝐭𝐢𝐦𝐞 : ${uptimeFormatted}
┃ ❍ 𝐣𝐞𝐫𝐬𝐢𝐨𝐧 : ${settings.version || '3.0.0'}
┃ ❍ 𝐩𝐫𝐞𝐟𝐢𝐱 : .
╰═════════════════⊷

*\`〄⟩ 𝐆𝐄𝐍𝐄𝐑𝐀𝐋 𝐂𝐎𝐌𝐌𝐀𝐍𝐃𝐒 |-𓋜*
╭══════════════⊷
┃ ❍ .𝐦𝐞𝐧𝐮 / .𝐡𝐞𝐥𝐩
┃ ❍ .𝐩𝐢𝐧𝐠
┃ ❍ .𝐚𝐥𝐢𝐯𝐞
┃ ❍ .𝐭𝐭𝐬
┃ ❍ .𝐨𝐰𝐧𝐞𝐫
┃ ❍ .𝐫𝐞𝐚𝐥𝐨𝐰𝐧𝐞𝐫
┃ ❍ .𝐣𝐨𝐤𝐞
┃ ❍ .𝐪𝐮𝐨𝐭𝐞
┃ ❍ .𝐟𝐚𝐜𝐭
┃ ❍ .𝐰𝐞𝐚𝐭𝐡𝐞𝐫
┃ ❍ .𝐧𝐞𝐰
┃ ❍ .𝐚𝐭𝐭𝐩
┃ ❍ .𝐥𝐲𝐫𝐢𝐜𝐬
┃ ❍ .𝐛𝐫𝐚𝐭
┃ ❍ .𝐛𝐫𝐚𝐭𝐯𝐢𝐝
┃ ❍ .𝟖𝐛𝐚𝐥𝐥
┃ ❍ .𝐠𝐫𝐨𝐮𝐩𝐢𝐧𝐟𝐨
┃ ❍ .𝐬𝐭𝐚𝐟𝐟 / 𝐚𝐝𝐦𝐢𝐧𝐬
┃ ❍ .𝐯𝐯
┃ ❍ .𝐭𝐫𝐭
┃ ❍ .𝐬𝐬
┃ ❍ .𝐣𝐢𝐝
┃ ❍ .𝐮𝐫𝐥
┃ ❍ .𝐢𝐦𝐠
┃ ❍ .𝐩𝐢𝐧𝐭𝐞𝐫𝐞𝐬𝐭𝐢𝐦𝐠
┃ ❍ .𝐛𝐢𝐧𝐠𝐢𝐦𝐠
┃ ❍ .𝐬𝐨𝐥𝐯𝐞
┃ ❍ .𝐚𝐠𝐞
┃ ❍ .𝐟𝐥𝐢𝐩𝐭𝐞𝐱𝐭
┃ ❍ .𝐬𝐞𝐭𝐛𝐨𝐭𝐟𝐨𝐧𝐭
╰══════════════⊷
${readMoreKey}
*\`〄⟩ 𝐀𝐃𝐌𝐈𝐍 𝐂𝐎𝐌𝐌𝐀𝐍𝐃𝐒 |-𓋜*
╭══════════════⊷
┃ ❍ .𝐛𝐚𝐧
┃ ❍ .𝐩𝐫𝐨𝐦𝐨𝐭𝐞
┃ ❍ .𝐝𝐞𝐦𝐨𝐭𝐞
┃ ❍ .𝐦𝐮𝐭𝐞
┃ ❍ .𝐮𝐧𝐦𝐮𝐭𝐞
┃ ❍ .𝐝𝐞𝐥𝐞𝐭𝐞
┃ ❍ .𝐤𝐢𝐜𝐤
┃ ❍ .𝐰𝐚𝐫𝐧
┃ ❍ .𝐰𝐚𝐫𝐧𝐢𝐧𝐠𝐬
┃ ❍ .𝐚𝐧𝐭𝐢𝐥𝐢𝐧𝐤
┃ ❍ .𝐚𝐧𝐭𝐢𝐛𝐚𝐝𝐰𝐨𝐫𝐝
┃ ❍ .𝐜𝐥𝐞𝐚𝐫
┃ ❍ .𝐭𝐚𝐠
┃ ❍ .𝐭𝐚𝐠𝐚𝐥𝐥
┃ ❍ .𝐭𝐚𝐠𝐧𝐨𝐭𝐚𝐝𝐦𝐢𝐧
┃ ❍ .𝐡𝐢𝐝𝐞𝐭𝐚𝐠
┃ ❍ .𝐜𝐡𝐚𝐭𝐛𝐨𝐭
┃ ❍ .𝐫𝐞𝐬𝐞𝐭𝐥𝐢𝐧𝐤
┃ ❍ .𝐚𝐧𝐭𝐢𝐭𝐚𝐠
┃ ❍ .𝐰𝐞𝐥𝐜𝐨𝐦𝐞
┃ ❍ .𝐠𝐨𝐨𝐝𝐛𝐲𝐞
┃ ❍ .𝐬𝐞𝐭𝐠𝐝𝐞𝐬𝐜
┃ ❍ .𝐬𝐞𝐭𝐠𝐧𝐚𝐦𝐞
┃ ❍ .𝐬𝐞𝐭𝐠𝐩𝐩
┃ ❍ .𝐠𝐞𝐭𝐠𝐫𝐨𝐮𝐩𝐩
┃ ❍ .𝐠𝐫𝐨𝐮𝐩𝐢𝐝
┃ ❍ .𝐜𝐥𝐨𝐬𝐞
┃ ❍ .𝐨𝐩𝐞𝐧
┃ ❍ .𝐚𝐩𝐩𝐫𝐨𝐯𝐞𝐚𝐥𝐥
┃ ❍ .𝐝𝐢𝐬𝐚𝐩𝐩𝐫𝐨𝐯𝐞𝐚𝐥𝐥
┃ ❍ .𝐚𝐧𝐭𝐢𝐬𝐭𝐢𝐜𝐤𝐞𝐫
┃ ❍ .𝐚𝐧𝐭𝐢𝐛𝐨𝐭
┃ ❍ .𝐚𝐧𝐭𝐢𝐟𝐨𝐫𝐰𝐚𝐫𝐝
┃ ❍ .𝐚𝐧𝐭𝐢𝐬𝐭𝐚𝐭𝐮𝐬 𝐨𝐧 / 𝐨𝐟𝐟
╰══════════════⊷
*\`〄⟩ 𝐎𝐖𝐍𝐄𝐑 𝐂𝐎𝐌𝐌𝐀𝐍𝐃𝐒 |-𓋜*
╭══════════════⊷
┃ ❍ .𝐮𝐩𝐝𝐚𝐭𝐞
┃ ❍ .𝐦𝐨𝐝𝐞
┃ ❍ .𝐜𝐥𝐞𝐚𝐫𝐬𝐞𝐬𝐬𝐢𝐨𝐧
┃ ❍ .𝐬𝐞𝐭𝐩𝐫𝐞𝐟𝐢𝐱
┃ ❍ .𝐚𝐧𝐭𝐢𝐝𝐞𝐥𝐞𝐭𝐞
┃ ❍ .𝐜𝐥𝐞𝐚𝐫𝐭𝐦𝐩
┃ ❍ .𝐬𝐞𝐭𝐭𝐢𝐧𝐠𝐬
┃ ❍ .𝐬𝐞𝐭𝐩𝐩
┃ ❍ .𝐠𝐞𝐭𝐩𝐩
┃ ❍ .𝐜𝐫𝐞𝐚𝐭𝐞𝐠𝐫
┃ ❍ .𝐚𝐮𝐭𝐨𝐫𝐞𝐚𝐜𝐭
┃ ❍ .𝐚𝐮𝐭𝐨𝐬𝐭𝐚𝐭𝐮𝐬
┃ ❍ .𝐚𝐮𝐭𝐨𝐭𝐲𝐩𝐢𝐧𝐠
┃ ❍ .𝐚𝐮𝐭𝐨𝐫𝐞𝐚𝐝
┃ ❍ .𝐚𝐧𝐭𝐢𝐜𝐚𝐥𝐥
┃ ❍ .𝐩𝐦𝐛𝐥𝐨𝐜𝐤𝐞𝐫
┃ ❍ .𝐩𝐦𝐛𝐥𝐨𝐜𝐤𝐞𝐫 𝐬𝐞𝐭𝐦𝐬𝐠 
┃ ❍ .𝐦𝐞𝐧𝐭𝐢𝐨𝐧
╰══════════════⊷
*\`〄⟩ 𝐀𝐔𝐃𝐈𝐎 𝐂𝐎𝐌𝐌𝐀𝐍𝐃𝐒 |-𓋜*
╭══════════════⊷
┃ ❍ .𝐛𝐚𝐬𝐬
┃ ❍ .𝐛𝐥𝐨𝐰
┃ ❍ .𝐞𝐫𝐫𝐚𝐩𝐞
┃ ❍ .𝐫𝐨𝐛𝐨𝐭
╰══════════════⊷
*\`〄⟩ 𝐂𝐎𝐍𝐕𝐄𝐑𝐓𝐄𝐑 |-𓋜*
╭══════════════⊷
┃ ❍ .𝐭𝐨𝐚𝐮𝐝𝐢𝐨
┃ ❍ .𝐯𝐨𝐥𝐯𝐢𝐝𝐞𝐨
┃ ❍ .𝐭𝐨𝐯𝐢𝐞𝐰𝐨𝐧𝐜𝐞
┃ ❍ .𝐞𝐝𝐢𝐭𝐜𝐚𝐩𝐭𝐢𝐨𝐧
╰══════════════⊷
*\`〄⟩ 𝐌𝐄𝐃𝐈𝐀 𝐓𝐎𝐎𝐋𝐒 |-𓋜*
╭══════════════⊷
┃ ❍ .𝐛𝐥𝐮𝐫
┃ ❍ .𝐬𝐢𝐦𝐚𝐠𝐞
┃ ❍ .𝐩𝐢𝐜
┃ ❍ .𝐬𝐭𝐢𝐜𝐤𝐞𝐫
┃ ❍ .𝐫𝐞𝐦𝐨𝐯𝐞𝐛𝐠
┃ ❍ .𝐫𝐞𝐦𝐢𝐧𝐢
┃ ❍ .𝐜𝐫𝐨𝐩
┃ ❍ .𝐭𝐠𝐬𝐭𝐢𝐜𝐤𝐞𝐫
┃ ❍ .𝐦𝐞𝐦𝐞
┃ ❍ .𝐭𝐚𝐤𝐞
┃ ❍ .𝐞𝐦𝐨𝐣𝐢𝐦𝐢𝐱
┃ ❍ .𝐢𝐠𝐬
┃ ❍ .𝐢𝐠𝐬𝐜
╰══════════════⊷
*\`〄⟩ 𝐏𝐈𝐄𝐒 𝐂𝐎𝐌𝐌𝐀𝐍𝐃𝐒 |-𓋜*
╭══════════════⊷
┃ ❍ .𝐩𝐢𝐞𝐬
┃ ❍ .𝐜𝐡𝐢𝐧𝐚
┃ ❍ .𝐢𝐧𝐝𝐨𝐧𝐞𝐬𝐢𝐚
┃ ❍ .𝐣𝐚𝐩𝐚𝐧
┃ ❍ .𝐤𝐨𝐫𝐞𝐚
┃ ❍ .𝐡𝐢𝐣𝐚𝐛
╰══════════════⊷
*\`〄⟩ 𝐆𝐀𝐌𝐄 𝐂𝐎𝐌𝐌𝐀𝐍𝐃𝐒 |-𓋜*
╭══════════════⊷
┃ ❍ .𝐭𝐢𝐜𝐭𝐚𝐜𝐭𝐨𝐞
┃ ❍ .𝐡𝐚𝐧𝐠𝐦𝐚𝐧
┃ ❍ .𝐠𝐮𝐞𝐬𝐬
┃ ❍ .𝐭𝐫𝐢𝐯𝐢𝐚
┃ ❍ .𝐚𝐧𝐬𝐰𝐞𝐫
┃ ❍ .𝐭𝐫𝐮𝐭𝐡
┃ ❍ .𝐝𝐚𝐫𝐞
╰══════════════⊷
*\`〄⟩ 𝐀𝐈 𝐂𝐎𝐌𝐌𝐀𝐍𝐃𝐒 |-𓋜*
╭══════════════⊷
┃ ❍ .𝐚𝐢
┃ ❍ .𝐠𝐞𝐦𝐢𝐧𝐢
┃ ❍ .𝐠𝐩𝐭
┃ ❍ .𝐢𝐦𝐚𝐠𝐢𝐧𝐞
┃ ❍ .𝐟𝐥𝐮𝐱
┃ ❍ .𝐬𝐨𝐫𝐚
╰══════════════⊷
*\`〄⟩ 𝐅𝐔𝐍 𝐂𝐎𝐌𝐌𝐀𝐍𝐃𝐒 |-𓋜*
╭══════════════⊷
┃ ❍ .𝐜𝐨𝐦𝐩𝐥𝐢𝐦𝐞𝐧𝐭
┃ ❍ .𝐢𝐧𝐬𝐮𝐥𝐭
┃ ❍ .𝐟𝐥𝐢𝐫𝐭
┃ ❍ .𝐬𝐡𝐚𝐲𝐚𝐫𝐢
┃ ❍ .𝐠𝐨𝐨𝐝𝐧𝐢𝐠𝐡𝐭
┃ ❍ .𝐫𝐨𝐬𝐞𝐝𝐚𝐲
┃ ❍ .𝐜𝐡𝐚𝐫𝐚𝐜𝐭𝐞𝐫
┃ ❍ .𝐰𝐚𝐬𝐭𝐞𝐝
┃ ❍ .𝐬𝐡𝐢𝐩
┃ ❍ .𝐬𝐢𝐦𝐩
┃ ❍ .𝐬𝐭𝐮𝐩𝐢𝐝
╰══════════════⊷
*\`〄⟩ 𝐓𝐄𝐗𝐓𝐌𝐀𝐊𝐄𝐑 𝐂𝐎𝐌𝐌𝐀𝐍𝐃𝐒 |-𓋜*
╭══════════════⊷
┃ ❍ .𝐦𝐞𝐭𝐚𝐥𝐥𝐢𝐜
┃ ❍ .𝐢𝐜𝐞
┃ ❍ .𝐬𝐧𝐨𝐰
┃ ❍ .𝐢𝐦𝐩𝐫𝐞𝐬𝐬𝐢𝐯𝐞
┃ ❍ .𝐦𝐚𝐭𝐫𝐢𝐱
┃ ❍ .𝐥𝐢𝐠𝐡𝐭
┃ ❍ .𝐧𝐞𝐨𝐧
┃ ❍ .𝐝𝐞𝐯𝐢𝐥
┃ ❍ .𝐩𝐮𝐫𝐩𝐥𝐞
┃ ❍ .𝐭𝐡𝐮𝐧𝐝𝐞𝐫
┃ ❍ .𝐥𝐞𝐚𝐯𝐞𝐬
┃ ❍ .𝟏𝟗𝟏𝟕
┃ ❍ .𝐚𝐫𝐞𝐧𝐚
┃ ❍ .𝐡𝐚𝐜𝐤𝐞𝐫
┃ ❍ .𝐬𝐚𝐧𝐝
┃ ❍ .𝐛𝐥𝐚𝐜𝐤𝐩𝐢𝐧𝐤
┃ ❍ .𝐠𝐥𝐢𝐭𝐜𝐡
┃ ❍ .𝐟𝐢𝐫𝐞
╰══════════════⊷
*\`〄⟩ 𝐃𝐎𝐖𝐍𝐋𝐎𝐀𝐃𝐄𝐑 𝐂𝐎𝐌𝐌𝐀𝐍𝐃𝐒 |-𓋜*
╭══════════════⊷
┃ ❍ .𝐩𝐥𝐚𝐲
┃ ❍ .𝐬𝐨𝐧𝐠
┃ ❍ .𝐬𝐩𝐨𝐭𝐢𝐟𝐲
┃ ❍ .𝐢𝐧𝐬𝐭𝐚𝐠𝐫𝐚𝐦
┃ ❍ .𝐟𝐚𝐜𝐞𝐛𝐨𝐨𝐤
┃ ❍ .𝐭𝐢𝐤𝐭𝐨𝐤
┃ ❍ .𝐯𝐢𝐝𝐞𝐨
┃ ❍ .𝐲𝐭𝐦𝐩𝟒
╰══════════════⊷
*\`〄⟩ 𝐌𝐈𝐒𝐂 𝐂𝐎𝐌𝐌𝐀𝐍𝐃𝐒 |-𓋜*
╭══════════════⊷
┃ ❍ .𝐡𝐞𝐚𝐫𝐭
┃ ❍ .𝐡𝐨𝐫𝐧𝐲
┃ ❍ .𝐜𝐢𝐫𝐜𝐥𝐞
┃ ❍ .𝐥𝐠𝐛𝐭
┃ ❍ .𝐥𝐨𝐥𝐢𝐜𝐞
┃ ❍ .𝐢𝐭𝐬-𝐬𝐨-𝐬𝐭𝐮𝐩𝐢𝐝
┃ ❍ .𝐧𝐚𝐦𝐞𝐜𝐚𝐫𝐝
┃ ❍ .𝐨𝐨𝐠𝐰𝐚𝐲
┃ ❍ .𝐭𝐰𝐞𝐞𝐭
┃ ❍ .𝐲𝐭𝐜𝐨𝐞𝐧𝐭
┃ ❍ .𝐜𝐨𝐦𝐫𝐚𝐝𝐞
┃ ❍ .𝐠𝐚𝐲
┃ ❍ .𝐠𝐥𝐚𝐬𝐬
┃ ❍ .𝐣𝐚𝐢𝐥
┃ ❍ .𝐩𝐚𝐬𝐬𝐞𝐝
┃ ❍ .𝐭𝐫𝐢𝐠𝐠𝐞𝐫𝐞𝐝
┃ ❍ .𝐠𝐢𝐭
┃ ❍ .𝐠𝐢𝐭𝐡𝐮by
┃ ❍ .𝐬𝐜
┃ ❍ .𝐬𝐜𝐫𝐢𝐩𝐭
┃ ❍ .𝐫𝐞𝐩𝐨
╰══════════════⊷
> 𝐙𝐎𝐑𝐎 𝐗𝐌𝐃 ⟩ - Bᴏᴛ v0.0.1
> _Crafted by Aadhi.xd乡_`;

    try {
        await sock.sendMessage(chatId, { 
            image: { url: menuImageUrl },
            caption: helpMessage,
            jpegThumbnail: thumbnailBuffer,
            buttons: [
                { buttonId: 'btn1', buttonText: { displayText: '📋' }, type: 1, url: 'https://whatsapp.com/channel/0029Vb7pgsF4tRrkS5CECe24' },
                { buttonId: 'btn2', buttonText: { displayText: '👍🏻' }, type: 1, url: 'https://wa.me/918136880986' },
                { buttonId: 'btn3', buttonText: { displayText: '🏷️' }, type: 1, url: 'https://github.com/A-d-i-t-h-y-a-n-x-d' }
            ],
            headerType: 4
        }, { quoted: vcardReply });

    } catch (error) {
        console.error('Error in help command:', error);
        await sock.sendMessage(chatId, { text: helpMessage }, { quoted: message });
    }
}

module.exports = helpCommand;
