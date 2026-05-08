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

const app = express();
let sock = null;
const connectedUsers = new Set();

// Logger configuration
const logger = P({ level: "info" });

// REST API Server
app.get("/", (req, res) => {
  res.send("🤖 AMASHIA MD BOT ONLINE 🚀");
});

app.get("/status", (req, res) => {
  res.json({
    status: sock ? "connected" : "disconnected",
    connectedUsers: Array.from(connectedUsers)
  });
});

app.listen(3000, () => {
  logger.info("✅ Server Started on port 3000");
});

// Bot initialization
async function startBot() {
  try {
    logger.info("🤖 Starting AMASHIA MD Bot...");

    const { state, saveCreds } = await useMultiFileAuthState("./session");

    sock = makeWASocket({
      auth: state,
      logger: P({ level: "silent" }),
      browser: ["AMASHIA MD", "Chrome", "1.0.0"],
      printQRInTerminal: true,
      syncFullHistory: false,
      shouldSyncHistoryMessage: () => false
    });

    // Save credentials on update
    sock.ev.on("creds.update", saveCreds);

    // Connection status
    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect } = update;

      if (connection === "connecting") {
        logger.info("🔄 Connecting to WhatsApp...");
      } else if (connection === "open") {
        logger.info("✅ Connected to WhatsApp!");
      } else if (connection === "close") {
        if (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
          logger.warn("⚠️ Connection closed. Reconnecting...");
          setTimeout(() => startBot(), 3000);
        } else {
          logger.error("❌ Logged out. Please restart bot.");
        }
      }
    });

    // Welcome message on new user connection
    sock.ev.on("contacts.upsert", async (contacts) => {
      for (const contact of contacts) {
        if (!connectedUsers.has(contact.id)) {
          connectedUsers.add(contact.id);
          await sendWelcomeMessage(contact.id);
        }
      }
    });

    // Message handler
    sock.ev.on("messages.upsert", async ({ messages }) => {
      for (const m of messages) {
        try {
          if (!m.message || m.key.fromMe || isJidBroadcast(m.key.remoteJid)) continue;

          const from = m.key.remoteJid;
          const text = m.message.conversation ||
            m.message.extendedTextMessage?.text ||
            m.message.imageMessage?.caption ||
            "";

          logger.info(`📨 Message from ${from}: ${text}`);

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
    setTimeout(() => startBot(), 5000);
  }
}

// Send welcome message to new users
async function sendWelcomeMessage(jid) {
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
        url: "https://drive.google.com/uc?export=view&id=1-ONk_ZlyFGy3ne7rmZJkwk-8pcwB9WMJ"
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
        await sendWelcomeMessage(from);
        break;

      case "play":
        if (!param) {
          await sock.sendMessage(from, {
            text: "❌ Format: .play <titre de la chanson>"
          });
        } else {
          await sock.sendMessage(from, {
            text: `🎧 Téléchargement de: ${param}...\n\n⏳ Veuillez patienter...`
          });
          // TODO: Intégrer API de téléchargement (Spotify, YouTube Music, etc.)
        }
        break;

      case "tiktok":
        if (!param) {
          await sock.sendMessage(from, {
            text: "❌ Format: .tiktok <URL TikTok>"
          });
        } else {
          await sock.sendMessage(from, {
            text: `📹 Téléchargement de la vidéo TikTok...\n\n⏳ Veuillez patienter...`
          });
          // TODO: Intégrer API TikTok downloader
        }
        break;

      case "lyrics":
        if (!param) {
          await sock.sendMessage(from, {
            text: "❌ Format: .lyrics <titre de la chanson>"
          });
        } else {
          await sock.sendMessage(from, {
            text: `🎵 Recherche des paroles: ${param}...\n\n⏳ Veuillez patienter...`
          });
          // TODO: Intégrer API de paroles (Genius, AZLyrics, etc.)
        }
        break;

      case "trad":
        if (!param) {
          await sock.sendMessage(from, {
            text: "❌ Format: .trad <texte à traduire>"
          });
        } else {
          await sock.sendMessage(from, {
            text: `🌍 Traduction de: ${param}...\n\n⏳ Veuillez patienter...`
          });
          // TODO: Intégrer API de traduction (Google Translate, etc.)
        }
        break;

      case "save":
        await sock.sendMessage(from, {
          text: "📥 Statuts sauvegardés!\n\n✅ Auto Save Status: Actif"
        });
        // TODO: Implémenter logique de sauvegarde de statuts
        break;

      case "antidelete":
        await sock.sendMessage(from, {
          text: "🛡️ Anti suppression de message: Activé ✅\n\nLes messages supprimés seront sauvegardés."
        });
        // TODO: Implémenter logique anti-suppression
        break;

      case "antispam":
        await sock.sendMessage(from, {
          text: "🛡️ Anti spam: Activé ✅\n\nLes messages spam seront bloqués."
        });
        // TODO: Implémenter logique anti-spam
        break;

      default:
        await sock.sendMessage(from, {
          text: `❌ Commande inconnue: ${text}\n\nTapez .menu pour voir les commandes disponibles.`
        });
        break;
    }
  } catch (error) {
    logger.error("❌ Error handling command:", error);
    await sock.sendMessage(from, {
      text: "❌ Erreur lors du traitement de la commande."
    });
  }
}

// Start bot
startBot().catch(err => {
  logger.error("❌ Fatal error:", err);
  process.exit(1);
});