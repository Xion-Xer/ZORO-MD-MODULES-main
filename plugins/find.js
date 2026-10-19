const fetch = require('node-fetch');
const { GoogleGenAI } = require('@google/genai');

// ==========================================
// HARDCODED CREDENTIALS
// ==========================================
const GEMINI_API_KEY = "AQ.Ab8RN6Kv1G-fjmbHxqjgPFZbsNKGBxlozxUMvYqoSBgEHrOH3w";
const GOOGLE_SEARCH_API_KEY = "AIzaSyDvLB63zbpbkKXUXF9VWzzHiolFgPM9UdQ";
const SEARCH_ENGINE_ID = "d064955b6bf534c90";

// Google Custom Search execution
async function executeGoogleSearch(searchQuery) {
    const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_SEARCH_API_KEY}&cx=${SEARCH_ENGINE_ID}&q=${encodeURIComponent(searchQuery)}`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Google Search API Error: ${response.status}`);
    }
    const data = await response.json();
    if (!data.items || data.items.length === 0) {
        return "No web results found.";
    }
    return data.items.slice(0, 3).map((item, index) => ({
        position: index + 1,
        title: item.title,
        snippet: item.snippet,
        link: item.link
    }));
}

// Google Search Tool declaration for Gemini
const googleSearchTool = {
    functionDeclarations: [
        {
            name: "googleSearch",
            description: "Searches the live internet via Google Custom Search API to fetch real-time web pages, recent news, and factual details.",
            parameters: {
                type: "OBJECT",
                properties: {
                    query: {
                        type: "STRING",
                        description: "The search query generated based on the user question."
                    }
                },
                required: ["query"]
            }
        }
    ]
};

// ==========================================
// 1. .FINDSONG HANDLER
// ==========================================
async function handleFindSong(sock, chatId, message, query) {
    if (!query) {
        await sock.sendMessage(chatId, { 
            text: '_Please type `.findsong [song name or lyrics]`!_\n\n_Example: `.findsong believer imagine dragons`_' 
        }, { quoted: message });
        return;
    }

    await sock.sendMessage(chatId, { react: { text: '🎵', key: message.key } });

    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
            { role: 'user', parts: [{ text: `Find detailed information, artist name, album, lyrics, and YouTube search context for the song: "${query}". Provide a well-formatted clean response.` }] }
        ]
    });

    const reply = response.text || "Could not find details for this song.";
    await sock.sendMessage(chatId, { text: `🎵 *Find Song Result*\n\n${reply}` }, { quoted: message });
}

// ==========================================
// 2. .FINDANSWER HANDLER
// ==========================================
async function handleFindAnswer(sock, chatId, message, query) {
    if (!query) {
        await sock.sendMessage(chatId, { 
            text: '_Please type `.findanswer [your question]`!_\n\n_Example: `.findanswer what is the latest news about space`_' 
        }, { quoted: message });
        return;
    }

    await sock.sendMessage(chatId, { react: { text: '🤖', key: message.key } });

    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

    const chatSession = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
            { role: 'user', parts: [{ text: `User Question: ${query}. Use the googleSearch tool only if you absolutely require live web data or current information to answer accurately.` }] }
        ],
        config: {
            tools: [googleSearchTool]
        }
    });

    let finalReply = "";
    const call = chatSession.functionCalls?.[0];

    if (call && call.name === "googleSearch") {
        const searchQuery = call.args.query || query;
        const searchResults = await executeGoogleSearch(searchQuery);

        const secondResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                { role: 'user', parts: [{ text: `User Question: ${query}` }] },
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
            ]
        });

        finalReply = secondResponse.text || "Failed to generate an accurate response.";
    } else {
        finalReply = chatSession.text || "Failed to generate an accurate response.";
    }

    await sock.sendMessage(chatId, { text: `🤖 *Find Answer*\n\n${finalReply}` }, { quoted: message });
}

// ==========================================
// MAIN MASTER COMMAND DISPATCHER
// ==========================================
async function findCommand(sock, chatId, message) {
    try {
        const text = message.message?.conversation || 
                     message.message?.extendedTextMessage?.text || 
                     message.message?.imageMessage?.caption || 
                     message.message?.videoMessage?.caption || "";

        const trimmedText = text.trim();

        // Check for .findsong
        if (/^\.findsong\b/i.test(trimmedText) || /^\.find song\b/i.test(trimmedText)) {
            const query = trimmedText.replace(/^\.findsong\s*/i, '').replace(/^\.find song\s*/i, '').trim();
            await handleFindSong(sock, chatId, message, query);
        } 
        // Check for .findanswer
        else if (/^\.findanswer\b/i.test(trimmedText) || /^\.find answer\b/i.test(trimmedText)) {
            const query = trimmedText.replace(/^\.findanswer\s*/i, '').replace(/^\.find answer\s*/i, '').trim();
            await handleFindAnswer(sock, chatId, message, query);
        }
    } catch (error) {
        console.error("Find Command Error:", error);
        await sock.sendMessage(chatId, { text: `❌ _Error processing request: ${error.message}_` }, { quoted: message });
    }
}

module.exports = findCommand;
