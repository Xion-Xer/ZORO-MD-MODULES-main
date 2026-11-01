// AI Plugin (.gpt & .gemini) for ZORO-MD (Clean Output & Custom Channel)
const fetch = require('node-fetch');

async function aiCommand(sock, chatId, message) {
    try {
        const text = message.message?.conversation || 
                     message.message?.extendedTextMessage?.text ||
                     message.message?.imageMessage?.caption ||
                     message.message?.videoMessage?.caption || '';
        
        if (!text) {
            return await sock.sendMessage(chatId, { 
                text: "Please provide a question after .gpt or .gemini\n\nExample: .gpt Give me an advice" 
            }, { quoted: message });
        }

        const parts = text.split(' ');
        const command = parts[0].toLowerCase();
        const query = parts.slice(1).join(' ').trim();

        if (!query) {
            return await sock.sendMessage(chatId, { 
                text: "Please provide a question after the command." 
            }, { quoted: message });
        }

        // Add processing reaction safely
        try {
            await sock.sendMessage(chatId, {
                react: { text: '🤖', key: message.key }
            });
        } catch (e) {}

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        let apiUrl = '';
        let newsletterName = '';

        if (command === '.gpt') {
            apiUrl = `https://xenosirapis.zone.id/api/chatgpt?prompt=${encodeURIComponent(query)}`;
            newsletterName = '𝚉𝙾𝚁𝙾 𝙼𝙳 𝙲𝙷𝙰𝚃𝙶𝙿𝚃';
        } else if (command === '.gemini') {
            apiUrl = `https://xenosirapis.zone.id/api/gemini?prompt=${encodeURIComponent(query)}`;
            newsletterName = '𝚉𝙾𝚁𝙾 𝙼𝙳 𝙶𝙴𝙼𝙸𝙽𝙸';
        } else {
            clearTimeout(timeout);
            return;
        }

        let answer = null;

        try {
            const response = await fetch(apiUrl, { signal: controller.signal });
            clearTimeout(timeout);

            if (response.ok) {
                const data = await response.json();
                answer = data.result || data.data || data.message || data.response || data.answer || (typeof data === 'string' ? data : null);

                if (typeof answer === 'object' && answer !== null) {
                    answer = answer.text || answer.content || answer.result || JSON.stringify(answer);
                }
            }
        } catch (fetchErr) {
            clearTimeout(timeout);
        }

        if (answer && typeof answer === 'string') {
            // Aggressive cleaning to remove WhatsApp links, channel invites, and promotional footers
            let cleanedAnswer = answer
                .replace(/https?:\/\/whatsapp\.com\/channel\/[^\s]+/gi, '')
                .replace(/https?:\/\/t\.me\/[^\s]+/gi, '')
                .replace(/join my channel[^\n]*/gi, '')
                .replace(/whatsapp channel[^\n]*/gi, '')
                .replace(/powered by[^\n]*/gi, '')
                .trim();

            if (!cleanedAnswer) cleanedAnswer = answer.trim();

            await sock.sendMessage(chatId, {
                text: cleanedAnswer,
                contextInfo: { 
                    forwardingScore: 1, 
                    isForwarded: true, 
                    forwardedNewsletterMessageInfo: { 
                        newsletterJid: '0029Vb7pgsF4tRrkS5CECe24@newsletter', // 👉 നിന്റെ ചാനൽ JID
                        newsletterName: newsletterName 
                    } 
                }
            }, { quoted: message });
        } else {
            throw new Error('API returned empty or invalid response');
        }

    } catch (error) {
        try {
            await sock.sendMessage(chatId, {
                react: { text: '❌', key: message.key }
            });
        } catch (e) {}

        await sock.sendMessage(chatId, {
            text: "❌ Failed to generate response. Please try again later."
        }, { quoted: message });
    }
}

aiCommand.command = ['gpt', 'gemini'];
aiCommand.description = 'Interact with ChatGPT and Gemini AI models';

module.exports = aiCommand;
