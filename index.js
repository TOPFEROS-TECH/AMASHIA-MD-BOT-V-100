const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  isJidBroadcast,
  fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys");

const express = require("express");
const P = require("pino");
const fs = require("fs");
require("dotenv").config();

const app = express();

const sessions = {};
const connectedUsers = new Set();

// Logger
const logger = P({ level: "info" });

// Server
app.get("/", (req, res) => {
  res.send("🤖 AMASHIA MD BOT ONLINE 🚀");
});

app.get("/status", (req, res) => {
  res.json({
    sessions: Object.keys(sessions),
    totalSessions: Object.keys(sessions).length,
    connectedUsers: Array.from(connectedUsers)
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  logger.info(`✅ Server Started on port ${PORT}`);
});

// Start Bot
async function startBot(sessionId = "main") {

  try {

    logger.info(`🤖 Starting Session: ${sessionId}`);

    // Create sessions folder
    if (!fs.existsSync("./sessions")) {
      fs.mkdirSync("./sessions");
    }

    const sessionPath = `./sessions/${sessionId}`;

    // Create session folder
    if (!fs.existsSync(sessionPath)) {
      fs.mkdirSync(sessionPath);
    }

    const { state, saveCreds } =
      await useMultiFileAuthState(sessionPath);

    const { version } =
      await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      auth: state,
      logger: P({ level: "silent" }),
      browser: ["AMASHIA MD", "Chrome", "1.0.0"],
      printQRInTerminal: false,
      syncFullHistory: false,
      shouldSyncHistoryMessage: () => false
    });

    sessions[sessionId] = sock;

    // Save credentials
    sock.ev.on("creds.update", saveCreds);

    // Pairing Code
    if (!sock.authState.creds.registered) {

      const phoneNumber =
        process.env.PHONE_NUMBER;

      setTimeout(async () => {

        const code =
          await sock.requestPairingCode(phoneNumber);

        logger.info(`
╔══════════════════════╗
║   🔗 PAIRING CODE 🔗  ║
╚══════════════════════╝

➡️ CODE: ${code}

📲 WhatsApp > Linked Devices
`);

      }, 3000);
    }

    // Connection update
    sock.ev.on("connection.update", async (update) => {

      const { connection, lastDisconnect } = update;

      if (connection === "connecting") {
        logger.info(`🔄 Connecting ${sessionId}...`);
      }

      if (connection === "open") {
        logger.info(`✅ ${sessionId} Connected to WhatsApp`);
      }

      if (connection === "close") {

        if (
          lastDisconnect?.error?.output?.statusCode !==
          DisconnectReason.loggedOut
        ) {

          logger.warn(`⚠️ Reconnecting ${sessionId}...`);

          setTimeout(() => {
            startBot(sessionId);
          }, 3000);

        } else {

          logger.error(`❌ ${sessionId} Logged out`);
        }
      }
    });

    // Welcome new contacts
    sock.ev.on("contacts.upsert", async (contacts) => {

      for (const contact of contacts) {

        if (!connectedUsers.has(contact.id)) {

          connectedUsers.add(contact.id);

          await sendWelcomeMessage(sock, contact.id);
        }
      }
    });

    // Messages
    sock.ev.on("messages.upsert", async ({ messages }) => {

      for (const m of messages) {

        try {

          if (
            !m.message ||
            m.key.fromMe ||
            isJidBroadcast(m.key.remoteJid)
          ) continue;

          const from = m.key.remoteJid;

          const text =
            m.message.conversation ||
            m.message.extendedTextMessage?.text ||
            m.message.imageMessage?.caption ||
            "";

          logger.info(`📨 ${sessionId} => ${from}: ${text}`);

          if (text.startsWith(".")) {

            await handleCommands(
              sock,
              from,
              text,
              m
            );
          }

        } catch (error) {

          logger.error(
            "❌ Error processing message:",
            error
          );
        }
      }
    });

  } catch (error) {

    logger.error("❌ Error starting bot:", error);

    setTimeout(() => {
      startBot(sessionId);
    }, 5000);
  }
}

// Welcome Message
async function sendWelcomeMessage(sock, jid) {

  try {

    const welcomeText = `
╔══════════════════════╗
║    🤖 AMASHIA MD 🤖   ║
║      VERSION 1.0.0    ║
╚══════════════════════╝

╭━━〔 ⚡ WELCOME ⚡ 〕━━⬣
┃ 🎉 Bienvenue sur
┃ 🤖 AMASHIA MD BOT
┃ 🚀 Le bot WhatsApp
┃ ⚡ le plus rapide & stable
╰━━━━━━━━━━━━━━━━━━⬣

╭━━〔 📌 COMMANDES 📌 〕━━⬣

┃ 🎧 MEDIA
┃ ━━━━━━━━━━━━━━━
┃ ➤ .play <titre>
┃ ➤ .tiktok <url>
┃ ➤ .lyrics <titre>

┃ 🌍 TRADUCTION
┃ ━━━━━━━━━━━━━━━
┃ ➤ .trad <texte>

┃ 📥 STATUS
┃ ━━━━━━━━━━━━━━━
┃ ➤ .save
┃ ➤ Auto Save Status ✅

┃ 🛡️ SECURITE
┃ ━━━━━━━━━━━━━━━
┃ ➤ .antidelete
┃ ➤ .antispam

┃ 👁️ AUTRES
┃ ━━━━━━━━━━━━━━━
┃ ➤ .menu
┃ ➤ .alive

╰━━━━━━━━━━━━━━━━━━⬣

╭━━〔 🚀 POWERED BY 🚀 〕━━⬣
┃ 👨‍💻 TOPFEROS TECH
┃ ⚡ Fast • Stable • Powerful
┃ 🌐 Multi Device Enabled
╰━━━━━━━━━━━━━━━━━━⬣
`;

    await sock.sendMessage(jid, {
      image: {
        url: process.env.BOT_IMAGE_URL
      },
      caption: welcomeText
    });

  } catch (error) {

    logger.error(
      "❌ Error sending welcome message:",
      error
    );
  }
}

// Commands
async function handleCommands(
  sock,
  from,
  text,
  message
) {

  const args =
    text.slice(1).split(" ");

  const command =
    args[0].toLowerCase();

  const param =
    args.slice(1).join(" ");

  try {

    switch (command) {

      case "menu":

        await sendWelcomeMessage(sock, from);

        break;

      case "alive":

        await sock.sendMessage(from, {
          text: `
╭━━〔 🤖 BOT STATUS 🤖 〕━━⬣
┃ ✅ Bot Online
┃ ⚡ Speed Stable
┃ 🚀 Railway Hosting
╰━━━━━━━━━━━━━━━━━━⬣
`
        });

        break;

      case "play":

        if (!param) {

          await sock.sendMessage(from, {
            text: `
╭━━〔 ❌ ERROR ❌ 〕━━⬣
┃ ➤ .play <titre>
╰━━━━━━━━━━━━━━━━━━⬣
`
          });

        } else {

          await sock.sendMessage(from, {
            text: `
╭━━〔 🎧 PLAY MUSIC 🎧 〕━━⬣
┃ 🔍 Recherche:
┃ ➤ ${param}
┃ ⏳ Veuillez patienter...
╰━━━━━━━━━━━━━━━━━━⬣
`
          });
        }

        break;

      case "tiktok":

        if (!param) {

          await sock.sendMessage(from, {
            text: `
╭━━〔 ❌ ERROR ❌ 〕━━⬣
┃ ➤ .tiktok <url>
╰━━━━━━━━━━━━━━━━━━⬣
`
          });

        } else {

          await sock.sendMessage(from, {
            text: `
╭━━〔 📹 TIKTOK DL 📹 〕━━⬣
┃ ⏳ Téléchargement...
╰━━━━━━━━━━━━━━━━━━⬣
`
          });
        }

        break;

      case "lyrics":

        if (!param) {

          await sock.sendMessage(from, {
            text: `
╭━━〔 ❌ ERROR ❌ 〕━━⬣
┃ ➤ .lyrics <titre>
╰━━━━━━━━━━━━━━━━━━⬣
`
          });

        } else {

          await sock.sendMessage(from, {
            text: `
╭━━〔 🎵 LYRICS 🎵 〕━━⬣
┃ 🔍 ${param}
┃ ⏳ Recherche...
╰━━━━━━━━━━━━━━━━━━⬣
`
          });
        }

        break;

      case "trad":

        if (!param) {

          await sock.sendMessage(from, {
            text: `
╭━━〔 ❌ ERROR ❌ 〕━━⬣
┃ ➤ .trad <texte>
╰━━━━━━━━━━━━━━━━━━⬣
`
          });

        } else {

          await sock.sendMessage(from, {
            text: `
╭━━〔 🌍 TRADUCTION 🌍 〕━━⬣
┃ ⏳ Traduction...
╰━━━━━━━━━━━━━━━━━━⬣
`
          });
        }

        break;

      case "save":

        await sock.sendMessage(from, {
          text: `
╭━━〔 📥 STATUS SAVE 📥 〕━━⬣
┃ ✅ Status sauvegardé
╰━━━━━━━━━━━━━━━━━━⬣
`
        });

        break;

      case "antidelete":

        await sock.sendMessage(from, {
          text: `
╭━━〔 🛡️ ANTIDELETE 🛡️ 〕━━⬣
┃ ✅ Activé
╰━━━━━━━━━━━━━━━━━━⬣
`
        });

        break;

      case "antispam":

        await sock.sendMessage(from, {
          text: `
╭━━〔 🛡️ ANTISPAM 🛡️ 〕━━⬣
┃ ✅ Activé
╰━━━━━━━━━━━━━━━━━━⬣
`
        });

        break;

      default:

        await sock.sendMessage(from, {
          text: `
╭━━〔 ❌ ERROR ❌ 〕━━⬣
┃ Commande inconnue
┃ Tapez .menu
╰━━━━━━━━━━━━━━━━━━⬣
`
        });

        break;
    }

  } catch (error) {

    logger.error(
      "❌ Error handling command:",
      error
    );

    await sock.sendMessage(from, {
      text: `
╭━━〔 ❌ SYSTEM ERROR ❌ 〕━━⬣
┃ Réessayez plus tard
╰━━━━━━━━━━━━━━━━━━⬣
`
    });
  }
}

// Start Bot
startBot("main").catch(err => {
  logger.error("❌ Fatal error:", err);
});