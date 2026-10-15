async function sayMyNameCommand(sock, chatId, message) {
    try {
        const creatorMessage = 
`✦─── ⌈ *CREATOR PROFILE* ⌋ ───✦

◈ *Name:* Aadhixd
◈ *Location:* Kerala, India
◈ *GitHub:* Xion-Xer

✦─── ⌈ *DEV STACK & LANGUAGES* ⌋ ───✦

⚙️ *Stack:* Node, Express, Mongo, Baileys, Redis, Docker, REST APIs, GraphQL, Socket.io, Git, Linux
💻 *Langs:* JS, TS, Py, C++, Java, Rust, PHP, Go, Bash, HTML/CSS, SQL, JSON, Markdown

────────────────────────────
_“The mastermind engineer who built ZORO-MD from the ground up, pushing the limits of automation with pure passion and code craftsmanship!”_ ⚡🔥`;

        await sock.sendMessage(chatId, {
            text: creatorMessage.trim()
        }, { quoted: message });

    } catch (error) {
        console.error('Error in saymyname command:', error);
        await sock.sendMessage(chatId, { text: '❌ Error executing command!' }, { quoted: message });
    }
}

module.exports = sayMyNameCommand;
