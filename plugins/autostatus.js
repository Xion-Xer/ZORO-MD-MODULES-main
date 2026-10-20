// WhatsApp Auto Status View & Smart Auto-React Plugin for ZORO-MD
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../data/autostatus_config.json');

// Memory Cache - ബോട്ടിൽ പെർഫോമൻസ് ലാഗ് ഒഴിവാക്കാൻ
let configCache = null;

function loadConfig() {
    if (configCache) return configCache;
    try {
        if (fs.existsSync(configPath)) {
            const data = fs.readFileSync(configPath, 'utf8');
            configCache = JSON.parse(data);
            return configCache;
        }
    } catch (err) {
        console.error('Error loading autostatus config:', err);
    }
    configCache = { enabled: false };
    return configCache;
}

function saveConfig(config) {
    try {
        const dir = path.dirname(configPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        configCache = config;
    } catch (err) {
        console.error('Error saving autostatus config:', err);
    }
}

// 🛑 കണ്ടു കഴിഞ്ഞ സ്റ്റാറ്റസ് ഐഡികൾ സേവ് ചെയ്തു വെക്കാൻ (ഡ്യൂപ്ലിക്കേറ്റ് തടയാൻ)
const processedStatuses = new Set();

// 🎨 അവസാനം ഉപയോഗിച്ച 10 ഇമോജികൾ ഓർത്തു വെക്കാൻ (ആവർത്തനം ഇല്ലാതെ വേറെ വേറെ ഇമോജികൾ വരാൻ)
const recentEmojis = [];

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

// 2. Status update listener
async function handleStatusUpdate(sock, status) {
    try {
        const config = loadConfig();
        // .autostatus on ചെയ്താൽ മാത്രം മുന്നോട്ട് പോകുക
        if (!config.enabled) return;

        const m = status.messages ? status.messages[0] : status;
        if (!m || !m.key || m.key.remoteJid !== 'status@broadcast') return;

        // നമ്മൾ ഇട്ട സ്വന്തം സ്റ്റാറ്റസുകൾക്ക് റിയാക്ട് ചെയ്യാതിരിക്കാൻ
        if (m.key.fromMe) return;

        const statusId = m.key.id;
        if (!statusId) return;

        // 🚨 പ്രധാനം: ഈ സ്റ്റാറ്റസ് ഐഡി മുൻപ് പ്രൊസസ്സ് ചെയ്തിട്ടുണ്ടെങ്കിൽ ഇവിടെ വെച്ച് സ്റ്റോപ്പ് ചെയ്യും (ഡ്യൂപ്ലിക്കേറ്റ് റിയാക്ഷൻ പോകില്ല)
        if (processedStatuses.has(statusId)) return;
        processedStatuses.add(statusId);

        // മെമ്മറി കൂടുതൽ എടുക്കാതിരിക്കാൻ പഴയ 2000 സ്റ്റാറ്റസ് ഐഡികൾ കഴിഞ്ഞ് ബാക്കി നീക്കം ചെയ്യും
        if (processedStatuses.size > 2000) {
            const firstItem = processedStatuses.values().next().value;
            processedStatuses.delete(firstItem);
        }

        const participant = m.key.participant || m.participant;
        if (!participant) return;

        // 1. സ്റ്റാറ്റസ് റീഡ് ചെയ്ത് Blue Tick നൽകുന്നു
        await sock.readMessages([{
            remoteJid: 'status@broadcast',
            id: statusId,
            participant: participant
        }]);

        // 37 ഇമോജികളുടെ ലിസ്റ്റ്
        const emojiList = [
            '😚', '🐾', '🍒', '🫦', '👅', '👀', '🫆', '👶🏻', '👨🏻‍🎓', '🧚🏻',
            '🧚🏻‍♂️', '💃🏻', '🐱', '🦋', '🐣', '🪽', '🐦‍🔥', '🍃', '🌺', '🌸',
            '🌚', '🌗', '🫐', '🍭', '🥂', '🤹🏻', '🎼', '📸', '🎀', '📈',
            '🔗', '💖', '🤍', '🔐', '💗', '☯️', '⚛️'
        ];

        // 🎲 റാൻഡം ഇമോജി സെലക്ഷൻ: തൊട്ടുമുമ്പ് ഉപയോഗിച്ച 10 ഇമോജികൾ ഒഴിവാക്കുന്നു
        const availableEmojis = emojiList.filter(e => !recentEmojis.includes(e));
        
        // ലഭ്യമായവയിൽ നിന്ന് മാത്രം ഒരു റാൻഡം ഇമോജി എടുക്കുന്നു
        const selectedEmoji = availableEmojis[Math.floor(Math.random() * availableEmojis.length)] || emojiList[0];

        // പുതിയ ഇമോജി റീസെന്റ് ലിസ്റ്റിലേക്ക് ചേർക്കുന്നു
        recentEmojis.push(selectedEmoji);
        if (recentEmojis.length > 10) {
            recentEmojis.shift(); // 10-ൽ കൂടുതൽ ആകുമ്പോൾ പഴയത് ഡിലീറ്റ് ചെയ്യും
        }

        // 2. സ്റ്റാറ്റസിന് റിയാക്ഷൻ അയക്കുന്നു
        await sock.sendMessage('status@broadcast', {
            react: {
                text: selectedEmoji,
                key: m.key
            }
        }, { statusJidList: [participant] });

        console.log(`[AUTO-STATUS] Reacted to status (${statusId}) with ${selectedEmoji}`);
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
