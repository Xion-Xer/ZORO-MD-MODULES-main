// 🧹 Fix for ENOSPC / temp overflow in hosted panels
const fs = require('fs');
const path = require('path');
const consoleLogger = require('./lib/consoleLogger');

// Redirect temp storage away from system /tmp
const customTemp = path.join(process.cwd(), 'temp');
if (!fs.existsSync(customTemp)) fs.mkdirSync(customTemp, { recursive: true });
process.env.TMPDIR = customTemp;
process.env.TEMP = customTemp;
process.env.TMP = customTemp;

// Auto-cleaner every 3 hours
setInterval(() => {
  fs.readdir(customTemp, (err, files) => {
    if (err) return;
    for (const file of files) {
      const filePath = path.join(customTemp, file);
      fs.stat(filePath, (err, stats) => {
        if (!err && Date.now() - stats.mtimeMs > 3 * 60 * 60 * 1000) {
          fs.unlink(filePath, () => {});
        }
      });
    }
  });
  console.log('🧹 Temp folder auto-cleaned');
}, 3 * 60 * 60 * 1000);

const settings = require('./settings');
require('./config.js');
const { isBanned } = require('./lib/isBanned');
const yts = require('yt-search');
const { fetchBuffer } = require('./lib/myfunc');
const fetch = require('node-fetch');
const youtubeDl = require('youtube-dl-exec');
const axios = require('axios');
const ffmpeg = require('fluent-ffmpeg');
const { isSudo } = require('./lib/index');
const { autoreadCommand, isAutoreadEnabled, handleAutoread } = require('./plugins/autoread');

// Command imports
const tagAllCommand = require('./plugins/tagall');
const helpCommand = require('./plugins/help');
const banCommand = require('./plugins/ban');
const { promoteCommand } = require('./plugins/promote');
const { demoteCommand } = require('./plugins/demote');
const muteCommand = require('./plugins/mute');
const unmuteCommand = require('./plugins/unmute');
const stickerCommand = require('./plugins/sticker');
const isAdmin = require('./lib/isAdmin');
const warnCommand = require('./plugins/warn');
const warningsCommand = require('./plugins/warnings');
const ttsCommand = require('./plugins/tts');
const { tictactoeCommand, handleTicTacToeMove } = require('./plugins/tictactoe');
const { incrementMessageCount, topMembers } = require('./plugins/topmembers');
const ownerCommand = require('./plugins/owner');
const deleteCommand = require('./plugins/delete');
const { handleAntilinkCommand, handleLinkDetection } = require('./plugins/antilink');
const { handleAntitagCommand, handleTagDetection } = require('./plugins/antitag');
const { Antilink } = require('./lib/antilink');
const { handleMentionDetection, mentionToggleCommand, setMentionCommand } = require('./plugins/mention');
const memeCommand = require('./plugins/meme');
const tagCommand = require('./plugins/tag');
const tagNotAdminCommand = require('./plugins/tagnotadmin');
const hideTagCommand = require('./plugins/hidetag');
const jokeCommand = require('./plugins/joke');
const quoteCommand = require('./plugins/quote');
const factCommand = require('./plugins/fact');
const weatherCommand = require('./plugins/weather');
const newsCommand = require('./plugins/news');
const kickCommand = require('./plugins/kick');
const simageCommand = require('./plugins/simage');
const attpCommand = require('./plugins/attp');
const { startHangman, guessLetter } = require('./plugins/hangman');
const { startTrivia, answerTrivia } = require('./plugins/trivia');
const { complimentCommand } = require('./plugins/compliment');
const { insultCommand } = require('./plugins/insult');
const { eightBallCommand } = require('./plugins/eightball');
const { lyricsCommand } = require('./plugins/lyrics');
const { dareCommand } = require('./plugins/dare');
const { truthCommand } = require('./plugins/truth');
const { clearCommand } = require('./plugins/clear');
const pingCommand = require('./plugins/ping');
const aliveCommand = require('./plugins/alive');
const sayMyNameCommand = require('./plugins/saymyname');
const animEditCommand = require('./plugins/animedit');
const blurCommand = require('./plugins/img-blur');
const { welcomeCommand, handleJoinEvent } = require('./plugins/welcome');
const { goodbyeCommand, handleLeaveEvent } = require('./plugins/goodbye');
const githubCommand = require('./plugins/github');
const { handleAntiBadwordCommand, handleBadwordDetection } = require('./lib/antibadword');
const antibadwordCommand = require('./plugins/antibadword');
const { handleChatbotCommand, handleChatbotResponse } = require('./plugins/chatbot');
const takeCommand = require('./plugins/take');
const { flirtCommand } = require('./plugins/flirt');
const characterCommand = require('./plugins/character');
const wastedCommand = require('./plugins/wasted');
const shipCommand = require('./plugins/ship');
const groupInfoCommand = require('./plugins/groupinfo');
const resetlinkCommand = require('./plugins/resetlink');
const staffCommand = require('./plugins/staff');
const unbanCommand = require('./plugins/unban');
const emojimixCommand = require('./plugins/emojimix');
const { handlePromotionEvent } = require('./plugins/promote');
const { handleDemotionEvent } = require('./plugins/demote');
const viewOnceCommand = require('./plugins/viewonce');
const clearSessionCommand = require('./plugins/clearsession');
const { autoStatusCommand, handleStatusUpdate } = require('./plugins/autostatus');
const { simpCommand } = require('./plugins/simp');
const { stupidCommand } = require('./plugins/stupid');
const stickerTelegramCommand = require('./plugins/stickertelegram');
const textmakerCommand = require('./plugins/textmaker');
const { handleAntideleteCommand, handleMessageRevocation, storeMessage } = require('./plugins/antidelete');
const clearTmpCommand = require('./plugins/cleartmp');
const setProfilePicture = require('./plugins/setpp');
const { setGroupDescription, setGroupName, setGroupPhoto } = require('./plugins/groupmanage');
const instagramCommand = require('./plugins/instagram');
const facebookCommand = require('./plugins/facebook');
const spotifyCommand = require('./plugins/spotify');
const playCommand = require('./plugins/play');
const tiktokCommand = require('./plugins/tiktok');
const songCommand = require('./plugins/song');
const aiCommand = require('./plugins/ai');
const urlCommand = require('./plugins/url');
const { handleTranslateCommand } = require('./plugins/translate');
const { handleSsCommand } = require('./plugins/ss');
const { addCommandReaction, handleAreactCommand } = require('./lib/reactions');
const { goodnightCommand } = require('./plugins/goodnight');
const { shayariCommand } = require('./plugins/shayari');
const { rosedayCommand } = require('./plugins/roseday');
const imagineCommand = require('./plugins/imagine');
const videoCommand = require('./plugins/video');
const sudoCommand = require('./plugins/sudo');
const { miscCommand, handleHeart } = require('./plugins/misc');
const { animeCommand } = require('./plugins/anime');
const { piesCommand, piesAlias } = require('./plugins/pies');
const stickercropCommand = require('./plugins/stickercrop');
const updateCommand = require('./plugins/update');
const removebgCommand = require('./plugins/removebg');
const { reminiCommand } = require('./plugins/remini');
const { igsCommand } = require('./plugins/igs');
const settingsCommand = require('./plugins/settings');
const soraCommand = require('./plugins/sora');
const imgCommand = require('./plugins/img');
const pinterestImgCommand = require('./plugins/pinterestimg');
const bingImgCommand = require('./plugins/bingimg');
const solveCommand = require('./plugins/solve');
const ageCommand = require('./plugins/age');
const fliptextCommand = require('./plugins/fliptext');
const { setbotfontCommand } = require('./plugins/setbotfont');
const bratCommand = require('./plugins/brat-local');
const createGroupCommand = require('./plugins/creategr');
const obfuscateCommand = require('./plugins/obfuscate');
const textstickerCommand = require('./plugins/textsticker');
const picCommand = require('./plugins/pic');

// NEW: Audio effects commands
const {
    bassCommand,
    blowCommand,
    deepCommand,
    errapeCommand,
    robotCommand
} = require('./plugins/audioeffects');

// Enhanced commands
const {
    approveCommand,
    disapproveCommand,
    getGroupPPCommand,
    getPPCommand,
    groupIdCommand,
    closeGroupCommand,
    openGroupCommand,
    antistickerCommand,
    handleAntiSticker,
    antibotCommand,
    handleAntiBot,
    handleAntiBotMessage,
    antiforwardCommand,
    handleAntiForward,
    toAudioCommand,
    volvideoCommand,
    toViewOnceCommand,
    editCaptionCommand,
    blockCommand,
    unblockAllCommand,
    autoreactionCommand,
    handleAutoReaction,
    realownerCommand
} = require('./plugins/enhanced-commands');

// Improved existing commands
const { anticallCommand: anticallImproved, handleCall } = require('./plugins/anticall-improved');
const { autotypingCommand: autotypingImproved, isAutotypingEnabled: isAutotypingEnabledNew, handleAutotypingForMessage: handleAutotypingNew } = require('./plugins/autotyping-improved');
const { pmblockerCommand: pmblockerImproved, readState: readPmBlockerStateNew } = require('./plugins/pmblocker-improved');

// Global settings
global.packname = settings.packname;
global.author = settings.author;
global.channelLink = "https://chat.whatsapp.com/JD6upTGh8a44e5t7pUahgq?s=cl&p=a&mlu=3&amv=0";
global.ytch = "ROMEO";

const channelInfo = {};

async function handleMessages(sock, messageUpdate, printLog) {
    let chatId;
    try {
        const { messages, type } = messageUpdate;
        if (type !== 'notify') return;

        const message = messages[0];
        if (!message?.message) return;

        await handleAutoread(sock, message);

        if (message.message) {
            storeMessage(sock, message);
        }

        if (message.message?.protocolMessage?.type === 0) {
            await handleMessageRevocation(sock, message);
            return;
        }

        chatId = message.key.remoteJid;
        const senderId = message.key.participant || chatId;
        const isGroup = chatId.endsWith('@g.us');

        const userMessageCheck = (
            message.message?.conversation || 
            message.message?.extendedTextMessage?.text || 
            ''
        ).trim();
        
        if (userMessageCheck === '1' || userMessageCheck === '2') {
            await songCommand(sock, chatId, message);
            return;
        }

        const senderIsSudo = await isSudo(senderId);
        const senderNumber = senderId.split('@')[0].split(':')[0];
        const senderHasOwnerAccess = (message.key.fromMe || senderNumber === settings.ownerNumber || senderIsSudo);

        const userMessage = (
            message.message?.conversation?.trim() ||
            message.message?.extendedTextMessage?.text?.trim() ||
            message.message?.imageMessage?.caption?.trim() ||
            message.message?.videoMessage?.caption?.trim() ||
            ''
        ).toLowerCase().replace(/\.\s+/g, '.').trim();

        const rawText = message.message?.conversation?.trim() ||
            message.message?.extendedTextMessage?.text?.trim() ||
            message.message?.imageMessage?.caption?.trim() ||
            message.message?.videoMessage?.caption?.trim() ||
            '';

        let senderName = 'Unknown User';
        let groupName = '';
        try {
            if (sock.contacts && sock.contacts[senderId]) {
                senderName = sock.contacts[senderId].name || senderName;
            }
            if (isGroup && sock.groupMetadata) {
                const groupMeta = await sock.groupMetadata(chatId).catch(() => ({}));
                groupName = groupMeta.subject || 'Unknown Group';
            }
        } catch (err) {}

        if (!message.key.fromMe) {
            consoleLogger.logIncomingMessage(senderId, senderName, userMessage || rawText, isGroup, groupName);
        }

        if (userMessage.startsWith('.')) {
            const commandName = userMessage.split(' ')[0].substring(1);
            consoleLogger.logCommandUsage(commandName, senderId, senderName, !isGroup, groupName);
        }

        if (isGroup && !message.key.fromMe) {
            const isDetectedAsBot = await handleAntiBotMessage(sock, chatId, message, senderId, userMessage);
            if (isDetectedAsBot) return;
        }

        if (!userMessage.startsWith('.')) {
            await handleAutoReaction(sock, chatId, message, isGroup);
            await handleAutotypingNew(sock, chatId, userMessage, isGroup);
        }

        try {
            const data = JSON.parse(fs.readFileSync('./data/messageCount.json'));
            if (!data.isPublic && !senderHasOwnerAccess) {
                return;
            }
        } catch (error) {}

        if (isBanned(senderId) && !userMessage.startsWith('.unban')) {
            return;
        }

        if (/^[1-9]$/.test(userMessage) || userMessage.toLowerCase() === 'surrender') {
            await handleTicTacToeMove(sock, chatId, senderId, userMessage);
            return;
        }

        if (!message.key.fromMe) incrementMessageCount(chatId, senderId);

        if (isGroup && userMessage) {
            await handleBadwordDetection(sock, chatId, message, userMessage, senderId);
            await Antilink(message, sock);
        }

        if (!isGroup && !senderHasOwnerAccess) {
            try {
                const pmState = readPmBlockerStateNew();
                if (pmState.enabled && !pmState.whitelist.includes(senderId)) {
                    await sock.sendMessage(chatId, { text: pmState.message || 'Private messages are blocked.' });
                    await new Promise(r => setTimeout(r, 1500));
                    try { await sock.updateBlockStatus(chatId, 'block'); } catch (e) { }
                    return;
                }
            } catch (e) { }
        }

        if (isGroup && !message.key.fromMe) {
            await handleAntiSticker(sock, chatId, message, senderId);
            await handleAntiForward(sock, chatId, message, senderId);
        }

        if (!userMessage.startsWith('.')) {
            if (isGroup) {
                await handleChatbotResponse(sock, chatId, message, userMessage, senderId);
                await handleTagDetection(sock, chatId, message, senderId);
                await handleMentionDetection(sock, chatId, message);
            }
            return;
        }

        let commandExecuted = false;

        switch (true) {
            case userMessage.startsWith('.sad') || userMessage.startsWith('.happy') || userMessage.startsWith('.angry'):
                await animEditCommand(sock, chatId, message);
                commandExecuted = true;
                break;
            case userMessage === '.help' || userMessage === '.menu' || userMessage === '.bot' || userMessage === '.list':
                await helpCommand(sock, chatId, message, global.channelLink);
                commandExecuted = true;
                break;
            case userMessage === '.sticker' || userMessage === '.s':
                await stickerCommand(sock, chatId, message);
                commandExecuted = true;
                break;
            case userMessage === '.ping':
                await pingCommand(sock, chatId, message);
                break;
            case userMessage === '.alive':
                await aliveCommand(sock, chatId, message);
                break;
            case userMessage === '.owner':
                await ownerCommand(sock, chatId);
                break;
            case userMessage.startsWith('.play') || userMessage.startsWith('.song') || userMessage.startsWith('.mp3') || userMessage.startsWith('.ytmp3'):
                await songCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.video') || userMessage.startsWith('.ytmp4'):
                await videoCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.gpt') || userMessage.startsWith('.gemini'):
                await aiCommand(sock, chatId, message);
                break;
            default:
                if (isGroup) {
                    if (userMessage) {
                        await handleChatbotResponse(sock, chatId, message, userMessage, senderId);
                    }
                    await handleTagDetection(sock, chatId, message, senderId);
                    await handleMentionDetection(sock, chatId, message);
                }
                commandExecuted = false;
                break;
        }

        if (userMessage.startsWith('.')) {
            await addCommandReaction(sock, message);
        }
    } catch (error) {
        console.error('❌ Error in message handler:', error.message);
    }
}

async function handleGroupParticipantUpdate(sock, update) {
    try {
        const { id, participants, action, author } = update;
        if (!id.endsWith('@g.us')) return;

        if (action === 'add') {
            await handleAntiBot(sock, id, participants);
            await handleJoinEvent(sock, id, participants);
        }
        if (action === 'remove') {
            await handleLeaveEvent(sock, id, participants);
        }
    } catch (error) {
        console.error('Error in handleGroupParticipantUpdate:', error);
    }
}

module.exports = {
    handleMessages,
    handleGroupParticipantUpdate,
    handleStatus: async (sock, status) => {
        await handleStatusUpdate(sock, status);
    }
};
