const fetch = require('node-fetch');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { downloadMediaMessage } = require('@aadhixd777/baileys');

// ==========================================
// HARDCODED CREDENTIALS
// ==========================================
const GEMINI_API_KEY = "AQ.Ab8RN6I7ZtFzQtRRXmB-nOMxNN8qr8U5Xe8wEtCFHUSeTOjK3Q";
const GOOGLE_SEARCH_API_KEY = "AIzaSyDvLB63zbpbkKXUXF9VWzzHiolFgPM9UdQ";
const SEARCH_ENGINE_ID = "d064955b6bf534c90";

const ai = new GoogleGenerativeAI(GEMINI_API_KEY);

async function executeGoogleSearch(searchQuery) {
    const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_SEARCH_API_KEY}&cx=${SEARCH_ENGINE_ID}&q=${encodeURIComponent(searchQuery)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Google Search API Error: ${response.status}`);
    const data = await response.json();
    if (!data.items || data.items.length === 0) return "No web results found.";
    return data.items.slice(0, 3).map((item, index) => ({
        position: index + 1,
        title: item.title,
        snippet: item.snippet,
        link: item.link
    }));
}

const googleSearchTool = {
    functionDeclarations: [{
        name: "googleSearch",
        description: "Searches the live internet via Google Custom Search API. Use this for finding songs, lyrics, BookMyShow, Crunchyroll, or latest news.",
        parameters: {
            type: "OBJECT",
            properties: { query: { type: "STRING" } },
            required: ["query"]
        }
    }]
};

async function findCommand(sock, chatId, message, query) {
    await sock.sendMessage(chatId, { react: { text: '🤖', key: message.key } });

    try {
        const isSongQuery = message.message?.conversation?.toLowerCase().includes('findsong') || 
                            message.message?.extendedTextMessage?.text?.toLowerCase().includes('findsong');

        // ജെമിനി 3.8 ഫ്ലാഷ് മോഡൽ സെറ്റ് ചെയ്തിരിക്കുന്നു
        const model = ai.getGenerativeModel({ model: 'gemini-3.8-flash', tools: [googleSearchTool] });

        const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        let contents = [];

        if (quoted && (quoted.audioMessage || quoted.voiceMessage)) {
            const mediaType = quoted.audioMessage ? quoted.audioMessage : quoted.voiceMessage;
            const buffer = await downloadMediaMessage(
                { message: quoted },
                'buffer',
                {},
                { logger: console }
            );

            contents.push({
                inlineData: {
                    mimeType: mediaType.mimetype || 'audio/ogg; codecs=opus',
                    data: buffer.toString('base64')
                }
            });

            const audioPrompt = query ? `Listen to this audio and answer this: ${query}` : `Listen to this audio and explain or answer what is being said in simple words.`;
            contents.push(audioPrompt);
        } else if (query) {
            let systemPrompt = "";
            if (isSongQuery) {
                systemPrompt = `User wants to find a song or music details based on this query: "${query}". Use the googleSearch tool to find exact details.`;
            } else {
                systemPrompt = `User Question: ${query}. Answer directly using your general knowledge. ONLY use the googleSearch tool if the user explicitly asks for recent news or current live events.`;
            }
            contents.push(systemPrompt);
        } else {
            await sock.sendMessage(chatId, { 
                text: '_Please type your question or reply to a voice message with `.findanswer`!_' 
            }, { quoted: message });
            return;
        }

        const chatSession = await model.generateContent(contents);

        let finalReply = "";
        const functionCalls = chatSession.response.functionCalls;
        const call = functionCalls ? functionCalls[0] : null;

        if (call && call.name === "googleSearch") {
            const searchQuery = call.args.query || query;
            const searchResults = await executeGoogleSearch(searchQuery);

            const secondResponse = await model.generateContent([
                { role: 'user', parts: [{ text: query || "Audio query" }] },
                { role: 'model', parts: [{ functionCall: call }] },
                { 
                    role: 'function', 
                    parts: [{ 
                        functionResponse: { 
                            name: 'googleSearch', 
                            response: { results: searchResults } 
                        } 
                    }] 
                }
            ]);
            finalReply = secondResponse.response.text() || "Failed to generate response.";
        } else {
            finalReply = chatSession.response.text() || "Failed to generate response.";
        }

        await sock.sendMessage(chatId, { text: `🤖 *Result*\n\n${finalReply}` }, { quoted: message });
    } catch (error) {
        console.error(error);
        await sock.sendMessage(chatId, { text: `❌ Error: ${error.message}` }, { quoted: message });
    }
}

module.exports = findCommand;
