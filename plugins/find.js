const fetch = require('node-fetch');
const Groq = require('groq-sdk');

// ==========================================
// GROQ CREDENTIALS
// ==========================================
const GROQ_API_KEY = "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";
const GOOGLE_SEARCH_API_KEY = "AIzaSyDvLB63zbpbkKXUXF9VWzzHiolFgPM9UdQ";
const SEARCH_ENGINE_ID = "d064955b6bf534c90";

const groq = new Groq({ apiKey: GROQ_API_KEY });
const ACTIVE_MODEL = "openai/gpt-oss-20b"; 

async function executeGoogleSearch(searchQuery) {
    try {
        let cleanQuery = searchQuery;
        if (typeof searchQuery === 'object' && searchQuery !== null) {
            cleanQuery = searchQuery.query || JSON.stringify(searchQuery);
        }
        
        if (!cleanQuery) return "No search query provided.";

        const url = `https://googleapis.com{GOOGLE_SEARCH_API_KEY}&cx=${SEARCH_ENGINE_ID}&q=${encodeURIComponent(String(cleanQuery).trim())}`;
        
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
    } catch (e) {
        console.error("Search Fetch Error:", e);
        return `Search failed due to error: ${e.message}`;
    }
}

const googleSearchTool = {
    type: "function",
    function: {
        name: "googleSearch",
        description: "Use this tool ONLY when the user is explicitly looking for songs, audio, lyrics, latest movies, live news, or real-time web results. For general knowledge, programming, and simple reasoning, do NOT use this tool and reply directly.",
        parameters: {
            type: "object",
            properties: { 
                query: { type: "string", description: "The specific song name, lyrics, or live data to search on Google." } 
            },
            required: ["query"]
        }
    }
};

async function findCommand(sock, chatId, message, query) {
    await sock.sendMessage(chatId, { react: { text: '🤖', key: message.key } });

    try {
        // യൂസറുടെ മെസ്സേജ് ടെക്സ്റ്റ് കൃത്യമായി എടുക്കുന്നു
        const userRawMessage = message.message?.conversation || message.message?.extendedTextMessage?.text || "";
        const isSongQuery = userRawMessage.toLowerCase().includes('findsong');

        let userMessageContent = query ? `User Question: ${query}` : "User sent a message.";

        let messages = [
            { 
                role: "system", 
                content: "You are a helpful AI assistant. Answer general knowledge and coding questions directly from your own knowledge. Only call the 'googleSearch' tool if the user explicitly asks for songs, audio files, lyrics, current news, or real-time internet information." 
            },
            { role: "user", content: userMessageContent }
        ];

        // നിർബന്ധപൂർവ്വം ടൂൾ ഓൺ ചെയ്യണോ അതോ ഓട്ടോമാറ്റിക് വേണോ എന്ന് കോഡ് വഴി തീരുമാനിക്കുന്നു
        let toolConfig = {
            model: ACTIVE_MODEL, 
            messages: messages,
            tools: [googleSearchTool]
        };

        // യൂസർ ഫൈൻഡ് സോങ്ങ് (findsong) ആണ് ഉപയോഗിച്ചതെങ്കിൽ ടൂൾ നിർബന്ധമായും റൺ ചെയ്യാൻ ആവശ്യപ്പെടുന്നു
        if (isSongQuery) {
            toolConfig.tool_choice = { type: "function", function: { name: "googleSearch" } };
        } else {
            toolConfig.tool_choice = "auto"; // സാധാരണ ചോദ്യങ്ങൾക്ക് ബോട്ട് സ്വയം ഉത്തരം പറയും
        }

        let chatCompletion = await groq.chat.completions.create(toolConfig);

        let responseMessage = chatCompletion.choices[0].message; 
        let finalReply = "";

        // മോഡൽ ടൂൾ കോൾ ചെയ്യുകയാണെങ്കിൽ മാത്രം ഗൂഗിൾ സെർച്ച് നടത്തുന്നു
        if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
            const toolCall = responseMessage.tool_calls[0]; 
            const functionName = toolCall.function.name;
            
            if (functionName === "googleSearch") {
                const args = JSON.parse(toolCall.function.arguments);
                const searchQuery = args.query || query || userRawMessage;
                
                const searchResults = await executeGoogleSearch(searchQuery);

                messages.push(responseMessage);
                messages.push({
                    tool_call_id: toolCall.id,
                    role: "tool",
                    name: functionName,
                    content: JSON.stringify(searchResults)
                });

                const secondResponse = await groq.chat.completions.create({
                    model: ACTIVE_MODEL, 
                    messages: messages
                });

                finalReply = secondResponse.choices[0].message.content || "Failed to generate response.";
            }
        } else {
            // സാധാരണ ചോദ്യങ്ങൾക്ക് ഗൂഗിളിൽ പോകാതെ നേരിട്ട് ബോട്ട് തരുന്ന മറുപടി
            finalReply = responseMessage.content || "Failed to generate response.";
        }

        await sock.sendMessage(chatId, { text: `🤖 *Result*\n\n${finalReply}` }, { quoted: message });
    } catch (error) {
        console.error(error);
        await sock.sendMessage(chatId, { text: `❌ Error: ${error.message}` }, { quoted: message });
    }
}

module.exports = findCommand;
