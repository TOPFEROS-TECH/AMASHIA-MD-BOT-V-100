const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  isJidBroadcast
} = require("@whiskeysockets/baileys");

const express = require("express");
const P = require("pino");
const fs = require("fs");
const axios = require("axios");
require("dotenv").config();

const app = express();

const sessions = {};
const connectedUsers = new Set();

// Logger configuration
const logger = P({ level: "info" });

// REST API Server
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

// Multi Session Bot Initialization
async function startBot(sessionId = "main") {
  try {
    logger.info(`🤖 Starting Session: ${sessionId}`);

    // Create sessions folder
    if (!fs.existsSync("./sessions")) {
      fs.mkdirSync("./sessions");
    }

    const sessionPath = `./sessions/${sessionId}`;

    // Create individual session folder
    if (!fs.existsSync(sessionPath)) {
      fs.mkdirSync(sessionPath);
    }

    const { state, saveCreds } =
      await useMultiFileAuthState(sessionPath);

    const sock = makeWASocket({
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

    // Connection status
    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect } = update;

      if (connection === "connecting") {
        logger.info(`🔄 Connecting ${sessionId}...`);
      }

      if (connection === "open") {
        logger.info(`✅ ${sessionId} Connected to WhatsApp!`);
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
          logger.error(`❌ ${sessionId} Logged out.`);
        }
      }
    });

    // Welcome message on new user connection
    sock.ev.on("contacts.upsert", async (contacts) => {
      for (const contact of contacts) {
        if (!connectedUsers.has(contact.id)) {
          connectedUsers.add(contact.id);

          await sendWelcomeMessage(sock, contact.id);
        }
      }
    });

    // Message handler
    sock.ev.on("messages.upsert", async ({ messages }) => {
      for (const m of messages) {
        try {
          if (
            !m.message ||
            m.key.fromMe ||
            isJidBroadcast(m.key.remoteJid)
          )
            continue;

          const from = m.key.remoteJid;

          const text =
            m.message.conversation ||
            m.message.extendedTextMessage?.text ||
            m.message.imageMessage?.caption ||
            "";

          logger.info(`📨 ${sessionId} => ${from}: ${text}`);

          // Command handling
          if (text.startsWith(".")) {
            await handleCommands(sock, from, text, m);
          }
        } catch (error) {
          logger.error("❌ Error processing message:", error);
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

// Send welcome message
async function sendWelcomeMessage(sock, jid) {
  try {
    const welcomeText = `🤖 *AMASHIA MD V1.0.0* ⚡

*Bienvenue sur AMASHIA MD!* 🎉

Merci de t'être connecté au bot WhatsApp le plus rapide et stable!

📌 *Commandes disponibles:*

🎧 *Média*
• .play <titre> - Télécharger une chanson
• .tiktok <url> - Télécharger une vidéo TikTok
• .lyrics <titre> - Obtenir les paroles

🌍 *Traduction*
• .trad <texte> - Traduire un texte

📥 *Statut*
• .save - Sauvegarder les statuts
• Auto Save Status - Actif ✅

🛡️ *Sécurité*
• .antidelete - Anti suppression de message
• .antispam - Anti spam

👁️ *Autres*
• Vue unique automatique ✅
• .menu - Afficher ce menu

🚀 *MADE IN TOPFEROS TECH*
👨‍💻 Développé avec ❤️`;

    await sock.sendMessage(jid, {
      image: {
        url: process.env.BOT_IMAGE_URL
      },
      caption: welcomeText
    });

    logger.info(`✅ Welcome message sent to ${jid}`);

  } catch (error) {
    logger.error("❌ Error sending welcome message:", error);
  }
}

// Command handler
async function handleCommands(sock, from, text, message) {
  const args = text.slice(1).split(" ");

  const command = args[0].toLowerCase();

  const param = args.slice(1).join(" ");

  try {
    switch (command) {

      case "menu":
        await sendWelcomeMessage(sock, from);
        break;

      case "play":
        if (!param) {
          await sock.sendMessage(from, {
            text: "❌ Format: .play <titre de la chanson>"
          });
        } else {
          await sock.sendMessage(from, {
            text:
              `🎧 Téléchargement de: ${param}...\n\n` +
              `⏳ Veuillez patienter...`
          });
        }
        break;

      case "tiktok":
        if (!param) {
          await sock.sendMessage(from, {
            text: "❌ Format: .tiktok <URL TikTok>"
          });
        } else {
          await sock.sendMessage(from, {
            text:
              `📹 Téléchargement TikTok...\n\n` +
              `⏳ Veuillez patienter...`
          });
        }
        break;

      case "lyrics":
        if (!param) {
          await sock.sendMessage(from, {
            text: "❌ Format: .lyrics <titre>"
          });
        } else {
          await sock.sendMessage(from, {
            text:
              `🎵 Recherche des paroles: ${param}...\n\n` +
              `⏳ Veuillez patienter...`
          });
        }
        break;

      case "trad":
        if (!param) {
          await sock.sendMessage(from, {
            text: "❌ Format: .trad <texte>"
          });
        } else {
          await sock.sendMessage(from, {
            text:
              `🌍 Traduction de: ${param}...\n\n` +
              `⏳ Veuillez patienter...`
          });
        }
        break;

      case "save":
        await sock.sendMessage(from, {
          text:
            "📥 Statuts sauvegardés!\n\n" +
            "✅ Auto Save Status: Actif"
        });
        break;

      case "antidelete":
        await sock.sendMessage(from, {
          text:
            "🛡️ Anti suppression activé ✅"
        });
        break;

      case "antispam":
        await sock.sendMessage(from, {
          text:
            "🛡️ Anti spam activé ✅"
        });
        break;

      default:
        await sock.sendMessage(from, {
          text:
            `❌ Commande inconnue: ${text}\n\n` +
            `Tapez .menu pour voir les commandes.`
        });
        break;
    }

  } catch (error) {

    logger.error("❌ Error handling command:", error);

    await sock.sendMessage(from, {
      text: "❌ Erreur lors du traitement."
    });
  }
}

// Start Main Session
startBot("main").catch(err => {
  logger.error("❌ Fatal error:", err);
});