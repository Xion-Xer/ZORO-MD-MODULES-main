// WhatsApp Auto Status View & Smart Auto-React Plugin for ZORO-MD
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../data/autostatus_config.json');

// Helper function to load configuration
function loadConfig() {
    try {
        if (fs.existsSync(configPath)) {
            const data = fs.readFileSync(configPath, 'utf8');
            return JSON.parse(data);
        }
    } catch (err) {
        console.error('Error loading autostatus config:', err);
    }
    return { enabled: false };
}

// Helper function to save configuration
function saveConfig(config) {
    try {
        const dir = path.dirname(configPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    } catch (err) {
        console.error('Error saving autostatus config:', err);
    }
}

let lastUsedEmoji = '';
const processedStatuses = new Set();

// 1. Command handler for .autostatus on / .autostatus off
async function autoStatusCommand(sock, chatId, message, args) {
    try {
        const option = args[0]?.toLowerCase();
        let config = loadConfig();

        if (option === 'on') {
            if (config.enabled) {
                await sock.sendMessage(chatId, { text: '_Auto status view and reaction is already enabled._' }, { quoted: message });
            } else {
                config.enabled = true;
                saveConfig(config);
                await sock.sendMessage(chatId, { text: '_Auto status view and reaction activated._' }, { quoted: message });
            }
        } else if (option === 'off') {
            if (!config.enabled) {
                await sock.sendMessage(chatId, { text: '_Auto status view and reaction is already disabled._' }, { quoted: message });
            } else {
                config.enabled = false;
                saveConfig(config);
                await sock.sendMessage(chatId, { text: '_Auto status view and reaction deactivated._' }, { quoted: message });
            }
        } else {
            const statusText = config.enabled ? 'ON' : 'OFF';
            await sock.sendMessage(chatId, { text: `_Auto Status is currently: *${statusText}*\nUsage: .autostatus on / .autostatus off_` }, { quoted: message });
        }
    } catch (err) {
        console.error('Auto Status Command Error:', err);
    }
}

// 2. Status update listener (Auto View & Smart Non-Repeating Reaction)
async function handleStatusUpdate(sock, status) {
    try {
        const config = loadConfig();
        if (!config.enabled) return;

        const m = status.messages ? status.messages[0] : status;
        if (!m || !m.key || m.key.remoteJid !== 'status@broadcast') return;

        const statusId = m.key.id;
        if (!statusId) return;

        // Prevent duplicate processing of already viewed status
        if (processedStatuses.has(statusId)) return;
        processedStatuses.add(statusId);

        // Memory cleanup to keep memory usage low
        if (processedStatuses.size > 200) {
            const firstItem = processedStatuses.values().next().value;
            processedStatuses.delete(firstItem);
        }

        const participant = m.key.participant || m.participant;
        if (!participant) return;

        // Automatically view the status
        await sock.readMessages([m.key]);

        // Custom emoji list provided by user (37 emojis)
        const emojiList = [
            '😚', '🐾', '🍒', '🫦', '👅', '👀', '🫆', '👶🏻', '👨🏻‍🎓', '🧚🏻',
            '🧚🏻‍♂️', '💃🏻', '🐱', '🦋', '🐣', '🪽', '🐦‍🔥', '🍃', '🌺', '🌸',
            '🌚', '🌗', '🫐', '🍭', '🥂', '🤹🏻', '🎼', '📸', '🎀', '📈',
            '🔗', '💖', '🤍', '🔐', '💗', '☯️', '⚛️'
        ];

        // Anti-repeat logic (filters out the last used emoji)
        const availableEmojis = emojiList.filter(e => e !== lastUsedEmoji);
        const selectedEmoji = availableEmojis[Math.floor(Math.random() * availableEmojis.length)];
        lastUsedEmoji = selectedEmoji;

        // Send single reaction to the status
        await sock.sendMessage('status@broadcast', {
            react: {
                text: selectedEmoji,
                key: m.key
            }
        }, { statusJidList: [participant] });

        console.log(`[AUTO-STATUS] Viewed status and reacted with ${selectedEmoji}`);
    } catch (err) {
        console.error('Auto Status Update Error:', err);
    }
}

autoStatusCommand.command = ['autostatus'];
autoStatusCommand.description = 'Automatically view statuses and react with randomized custom emojis';

module.exports = {
    autoStatusCommand,
    handleStatusUpdate
};
