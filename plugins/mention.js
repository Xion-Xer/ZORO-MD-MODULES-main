// ZORO-MD Mention Plugin (Universal Perfect Voice Note + Thumbnail Fix for Normal & Business WhatsApp)
const fs = require('fs')
const os = require('os')
const path = require('path')
const axios = require('axios')
const dns = require('dns').promises
const net = require('net')
const mongoose = require('mongoose')
const { spawn } = require('child_process')
const { downloadContentFromMessage } = require('@aadhixd777/baileys')

let FFMPEG = 'ffmpeg'
try { FFMPEG = require('ffmpeg-static') || 'ffmpeg' } catch (e) { /* system ffmpeg */ }

const MAX_MEDIA_BYTES = 20 * 1024 * 1024
const MONGO_URI = "mongodb+srv://sncckollam_db_user:u1F26vimHTZ9wYLe@cluster0.5qfiepf.mongodb.net/"

const INSTAGRAM_URL = "https://www.instagram.com/aadhi.x._______________?igsh=MWd5a21oeGtpZzNqYw==";
const CUSTOM_THUMB_URL = "https://files.catbox.moe/1057th.jpg";

async function ensureDb() {
    if (mongoose.connection.readyState === 1) return true
    try {
        await mongoose.connect(MONGO_URI)
        return true
    } catch (e) {
        console.log('[MENTION] DB Connect Error:', e.message)
        return false
    }
}

const MentionData = mongoose.models.MentionData || mongoose.model('MentionData', new mongoose.Schema({
    sessionId: { type: String, unique: true, index: true },
    audios: [Buffer],
    audio: Buffer,
    kind: String,
    wave: String
}, { collection: 'mentiondata' }))

const dataCache = new Map()

async function getData(sessionId) {
    if (dataCache.has(sessionId)) return dataCache.get(sessionId)
    const connected = await ensureDb()
    if (!connected) return {}
    try {
        const doc = await MentionData.findOne({ sessionId })
        const audios = (doc && Array.isArray(doc.audios) ? doc.audios : []).filter(a => a && a.length).map(a => Buffer.from(a))
        if (!audios.length && doc && doc.audio && doc.audio.length) audios.push(Buffer.from(doc.audio))
        const data = { audios, wave: (doc && doc.wave) || 'random' }
        dataCache.set(sessionId, data)
        return data
    } catch (e) {
        console.log('[MENTION] read error:', e.message)
        return {}
    }
}

async function saveData(sessionId, fields, unset = []) {
    const connected = await ensureDb()
    if (!connected) throw new Error('DB_OFFLINE')
    const update = {}
    if (Object.keys(fields).length > 0) update.$set = fields
    const unsetKeys = unset.filter(k => !(k in fields))
    if (unsetKeys.length > 0) {
        update.$unset = Object.fromEntries(unsetKeys.map(k => [k, 1]))
    }
    if (Object.keys(update).length === 0) return
    try {
        await MentionData.findOneAndUpdate({ sessionId }, update, { upsert: true })
    } catch (e) {
        console.log('[MENTION] save error:', e.code || '', e.message)
        throw e
    }
    dataCache.delete(sessionId)
}

async function resetData(sessionId) {
    await ensureDb()
    await MentionData.deleteOne({ sessionId })
    dataCache.delete(sessionId)
}

const dnsCb = require('dns')
const fallbackResolver = new dns.Resolver()
try { fallbackResolver.setServers(['1.1.1.1', '8.8.8.8']) } catch (e) {}
const DNS_RETRY = ['ENOTFOUND', 'EAI_AGAIN', 'ESERVFAIL', 'ETIMEOUT', 'ETIMEDOUT']

async function lookupAll(host) {
    try {
        return await dns.lookup(host, { all: true })
    } catch (err) {
        if (!DNS_RETRY.includes(err.code)) throw err
        try {
            const addrs = await fallbackResolver.resolve4(host)
            if (addrs.length) return addrs.map(a => ({ address: a, family: 4 }))
        } catch (e) {}
        throw err
    }
}

function smartLookup(hostname, options, cb) {
    if (typeof options === 'function') { cb = options; options = {} }
    dnsCb.lookup(hostname, options, (err, address, family) => {
        if (!err) return cb(null, address, family)
        if (!DNS_RETRY.includes(err.code)) return cb(err)
        fallbackResolver.resolve4(hostname).then(addrs => {
            if (!addrs.length) return cb(err)
            if (options && options.all) return cb(null, addrs.map(a => ({ address: a, family: 4 })))
            cb(null, addrs[0], 4)
        }).catch(() => cb(err))
    })
}

function isPrivateIp(ip) {
    if (net.isIPv6(ip)) {
        const v = ip.toLowerCase()
        if (v === '::1' || v === '::' || v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80')) return true
        const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
        return mapped ? isPrivateIp(mapped[1]) : false
    }
    const [a, b] = ip.split('.').map(Number)
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) ||
        (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127)
}

async function assertPublic(u) {
    const url = new URL(u)
    if (!/^https?:$/.test(url.protocol)) throw new Error('BAD_URL')
    const host = url.hostname.replace(/^\[|\]$/g, '')
    const addrs = net.isIP(host) ? [{ address: host }] : await lookupAll(host)
    if (!addrs.length || addrs.some(a => isPrivateIp(a.address))) throw new Error('BLOCKED_URL')
}

async function fetchBuffer(u, maxBytes = MAX_MEDIA_BYTES, hops = 4) {
    let current = u
    for (let i = 0; i <= hops; i++) {
        let res
        try {
            await assertPublic(current)
            res = await axios.get(current, {
                responseType: 'stream', maxRedirects: 0, timeout: 30000, lookup: smartLookup,
                validateStatus: st => st < 400, headers: { 'User-Agent': 'Mozilla/5.0' }
            })
        } catch (e) {
            try { e.host = new URL(current).hostname } catch (_) {}
            throw e
        }
        if (res.status >= 300 && res.headers.location) {
            res.data.destroy()
            current = new URL(res.headers.location, current).href
            await assertPublic(current)
            continue
        }
        if (Number(res.headers['content-length']) > maxBytes) { res.data.destroy(); throw new Error('FILE_TOO_LARGE') }
        const chunks = []
        let size = 0
        for await (const c of res.data) {
            size += c.length
            if (size > maxBytes) { res.data.destroy(); throw new Error('FILE_TOO_LARGE') }
            chunks.push(c)
        }
        return { buffer: Buffer.concat(chunks), contentType: String(res.headers['content-type'] || '').toLowerCase() }
    }
    throw new Error('TOO_MANY_REDIRECTS')
}

function runFfmpeg(args, collect = false) {
    return new Promise((resolve, reject) => {
        const p = spawn(FFMPEG, args, { stdio: ['ignore', collect ? 'pipe' : 'ignore', 'ignore'] })
        const chunks = []
        if (collect) p.stdout.on('data', c => chunks.push(c))
        p.on('error', () => reject(new Error('NO_FFMPEG')))
        p.on('close', code => code === 0 ? resolve(Buffer.concat(chunks)) : reject(new Error('FFMPEG_FAILED')))
    })
}

async function withTemp(fn) {
    const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'mention-'))
    try { return await fn(dir) }
    finally { fs.promises.rm(dir, { recursive: true, force: true }).catch(() => {}) }
}

const WAVE_BARS = 64
const clamp = (v) => Math.max(2, Math.min(100, Math.round(v)))
const rnd = (a, b) => a + Math.random() * (b - a)
const WAVE_STYLES = [
    () => { const f = rnd(2, 5); return i => 50 + 45 * Math.sin((i / WAVE_BARS) * Math.PI * 2 * f) },
    () => i => (i % 2 ? 95 : 6),
    () => i => 8 + 92 * (1 - Math.abs(i - WAVE_BARS / 2) / (WAVE_BARS / 2)),
    () => () => rnd(4, 100),
    () => i => (i % 5 === 0 ? 100 : rnd(4, 14))
]
const DNA_STYLES = [
    () => { const ph = rnd(0, 6.28); return i => 50 + 44 * Math.sin(i * 0.45 + ph) * (i % 2 ? 1 : -1) }
]

function funnyWaveform(mode) {
    const pool = mode === 'dna' ? DNA_STYLES : WAVE_STYLES.concat(DNA_STYLES)
    const fn = pool[Math.floor(Math.random() * pool.length)]()
    return new Uint8Array(Array.from({ length: WAVE_BARS }, (_, i) => clamp(fn(i))))
}

const toVoiceNote = (input) => withTemp(async (dir) => {
    const inFile = path.join(dir, 'in'), outFile = path.join(dir, 'out.ogg')
    await fs.promises.writeFile(inFile, input)
    await runFfmpeg(['-y', '-i', inFile, '-vn', '-t', '60', '-c:a', 'libopus', '-b:a', '48k', '-ar', '48000', '-ac', '1', '-f', 'ogg', outFile])
    return fs.promises.readFile(outFile)
})

const DEFAULT_AUDIOS = [
    "https://files.catbox.moe/9c6z8z.mp3",
    "https://files.catbox.moe/sd28g8.mp3",
    "https://files.catbox.moe/s8gehn.mp3"
];

async function sendMention(conn, to, quotedMek, sessionId) {
    let audio = null
    const d = await getData(sessionId)
    if (d.audios && d.audios.length) {
        audio = d.audios[Math.floor(Math.random() * d.audios.length)]
    } else {
        const randomUrl = DEFAULT_AUDIOS[Math.floor(Math.random() * DEFAULT_AUDIOS.length)];
        try {
            const buf = (await fetchBuffer(randomUrl)).buffer;
            audio = await toVoiceNote(buf);
        } catch (e) {
            console.log('[MENTION] default audio fetch failed:', e.message);
        }
    }
    if (!audio) return false

    let thumbBuffer = null;
    try {
        const resThumb = await axios.get(CUSTOM_THUMB_URL, { responseType: 'arraybuffer', timeout: 5000 });
        if (resThumb.data) thumbBuffer = Buffer.from(resThumb.data);
    } catch (e) {
        console.log('[MENTION] Thumbnail fetch error:', e.message);
    }

    const adReplyContext = {
        externalAdReply: {
            title: "ZORO MD OFFICIAL",
            body: "Click to visit Instagram Profile",
            showAdAttribution: true,
            renderLargerThumbnail: true,
            thumbnail: thumbBuffer || undefined,
            thumbnailUrl: CUSTOM_THUMB_URL,
            mediaType: 1,
            mediaUrl: INSTAGRAM_URL,
            sourceUrl: INSTAGRAM_URL
        }
    };

    // 🎯 യൂണിവേഴ്സൽ പക്കാ കോൺടെക്സ്റ്റ് ഹാൻഡ്‌ലിംഗ് (നോർമൽ & ബിസിനസ്സ് വാട്സാപ്പുകൾക്ക് ഒരുപോലെ)
    const participantJid = quotedMek.key.participant || quotedMek.key.remoteJid;

    await conn.sendMessage(to, {
        audio,
        mimetype: 'audio/ogg; codecs=opus',
        ptt: true,
        waveform: funnyWaveform(d.wave),
        contextInfo: {
            ...adReplyContext,
            mentionedJid: [participantJid],
            remoteJid: to,
            participant: participantJid
        }
    }, { quoted: quotedMek });
    return true
}

async function handleMentionDetection(sock, chatId, message) {
    try {
        if (!message || !message.message) return;
        if (message.key?.fromMe) return;

        const targetChat = message.key?.remoteJid || chatId;
        if (!targetChat) return;

        const botUser = sock.user || {};
        const botJid = botUser.id ? (sock.decodeJid ? sock.decodeJid(botUser.id) : botUser.id) : '';
        const botNum = botJid ? botJid.split('@')[0].split(':')[0] : '';
        const rawBotLid = botUser.lid ? botUser.lid.split('@')[0] : '';
        const botLid = rawBotLid.split(':')[0];
        const sessionId = botNum || "default_session";

        const msg = message.message || {};
        let mentionedJids = [];
        const contextInfo = msg.extendedTextMessage?.contextInfo || 
                            msg.imageMessage?.contextInfo || 
                            msg.videoMessage?.contextInfo || 
                            msg.audioMessage?.contextInfo;

        if (contextInfo && Array.isArray(contextInfo.mentionedJid)) {
            mentionedJids = contextInfo.mentionedJid;
        }

        const textContent = (msg.conversation || msg.extendedTextMessage?.text || '').toString();
        
        const isBotMentioned = mentionedJids.some(jid => {
            const cleanJid = jid.split('@')[0].split(':')[0];
            return (botNum && cleanJid === botNum) || (botLid && cleanJid === botLid);
        }) || (botNum && textContent.includes(botNum)) || (botLid && textContent.includes(botLid));

        console.log(`[MENTION CHECK] Chat: ${targetChat} | BotNum: ${botNum} | BotLid: ${botLid} | MentionedJids: ${JSON.stringify(mentionedJids)} | BotMentioned: ${isBotMentioned}`);

        if (!isBotMentioned) return;

        const success = await sendMention(sock, targetChat, message, sessionId);
        if (success) {
            console.log(`[MENTION SUCCESS] Successfully sent voice note reply to ${targetChat}`);
        } else {
            console.log(`[MENTION FAILED] Could not send voice note (Audio buffer missing)`);
        }
    } catch (err) {
        console.error('❌ [MENTION ERROR DETECTED]:', err);
    }
}

async function mentionToggleCommand(sock, chatId, message, args) {
    const senderId = message.key.participant || message.key.remoteJid;
    const botUser = sock.user || {};
    const botJid = botUser.id ? (sock.decodeJid ? sock.decodeJid(botUser.id) : botUser.id) : '';
    const isOwner = message.key.fromMe || (botJid && senderId.includes(botJid.split('@')[0]));

    if (!isOwner) return sock.sendMessage(chatId, { text: '❌ Only Bot Owner/Admin can use this command.' }, { quoted: message });

    const onoff = (typeof args === 'string' ? args : '').trim().toLowerCase();
    if (!['on','off'].includes(onoff)) return sock.sendMessage(chatId, { text: 'Usage: .mention on|off' }, { quoted: message });
    return sock.sendMessage(chatId, { text: `✅ Mention reply ${onoff}` }, { quoted: message });
}

async function setMentionCommand(sock, chatId, message) {
    const senderId = message.key.participant || message.key.remoteJid;
    const botUser = sock.user || {};
    const botJid = botUser.id ? (sock.decodeJid ? sock.decodeJid(botUser.id) : botUser.id) : '';
    const botNum = botJid ? botJid.split('@')[0].split(':')[0] : '';
    const sessionId = botNum || "default_session";

    const isOwner = message.key.fromMe || (botNum && senderId.includes(botNum));
    if (!isOwner) return sock.sendMessage(chatId, { text: '❌ Only Bot Owner/Admin can use this command.' }, { quoted: message });

    const msg = message.message || {};
    const textContent = (msg.conversation || msg.extendedTextMessage?.text || '').trim();
    const args = textContent.split(/\s+/).slice(1);
    const subCmd = args[0]?.toLowerCase();

    if (subCmd === 'reset') {
        await resetData(sessionId);
        return sock.sendMessage(chatId, { text: `✅ ZORO-MD Mention settings reset successfully!` }, { quoted: message });
    }

    if (subCmd === 'wave') {
        const waveType = args[1]?.toLowerCase();
        if (!['dna', 'random'].includes(waveType)) {
            return sock.sendMessage(chatId, { text: `❌ Usage: .setmention wave dna | random` }, { quoted: message });
        }
        await saveData(sessionId, { wave: waveType });
        return sock.sendMessage(chatId, { text: `✅ Mention waveform style set to *${waveType}*!` }, { quoted: message });
    }

    if (subCmd === 'test') {
        const ok = await sendMention(sock, chatId, message, sessionId);
        if (!ok) return sock.sendMessage(chatId, { text: `❌ No voice note set yet.` }, { quoted: message });
        return;
    }

    const quotedMsg = msg.extendedTextMessage?.contextInfo?.quotedMessage;
    if (quotedMsg && (quotedMsg.audioMessage || quotedMsg.videoMessage)) {
        try {
            const mediaType = quotedMsg.audioMessage ? quotedMsg.audioMessage : quotedMsg.videoMessage;
            const typeStr = quotedMsg.audioMessage ? 'audio' : 'video';
            const stream = await downloadContentFromMessage(mediaType, typeStr);
            const chunks = [];
            for await (const chunk of stream) chunks.push(chunk);
            const buf = Buffer.concat(chunks);

            const vn = await toVoiceNote(buf);
            await saveData(sessionId, { audios: [vn], kind: 'audio' });
            return sock.sendMessage(chatId, { text: `✅ ZORO-MD Mention voice note saved successfully!` }, { quoted: message });
        } catch (e) {
            console.error('❌ [SETMENTION SAVE ERROR]:', e);
            return sock.sendMessage(chatId, { text: `❌ Failed to save quoted media: ${e.message}` }, { quoted: message });
        }
    }

    return sock.sendMessage(chatId, {
        text: `╭─❖ 『 📣 𝙕𝙊𝙍𝙊 - 𝙈𝘿 ᴍᴇɴᴛɪᴏɴ ꜱᴇᴛᴛɪɴɢꜱ 』 ❖\n` +
              `│ ✦ ꜱᴛᴀᴛᴜꜱ ➱ ON\n` +
              `╰──────────────⍟\n\n` +
              `📌 *Usage Commands:*\n` +
              `• Reply to audio with \`.setmention\` to save.\n` +
              `• \`.setmention test\` - Test current mention voice.\n` +
              `• \`.setmention wave dna\` - Set DNA waveform.\n` +
              `• \`.setmention wave random\` - Set random waveform.\n` +
              `• \`.setmention reset\` - Reset mention settings.`
    }, { quoted: message });
}

module.exports = { handleMentionDetection, mentionToggleCommand, setMentionCommand };
