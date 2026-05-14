global.crypto = require("crypto").webcrypto;


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

  res.send(`
  <html>
  <head>
    <title>AMASHIA MD</title>

    <style>

      body{
        background:#0f0f0f;
        color:white;
        font-family:Arial;
        text-align:center;
        padding-top:60px;
      }

      .box{
        background:#1c1c1c;
        width:350px;
        margin:auto;
        padding:30px;
        border-radius:15px;
        box-shadow:0 0 20px #00ffcc;
      }

      input{
        width:90%;
        padding:12px;
        border:none;
        border-radius:10px;
        margin-top:15px;
        font-size:18px;
      }

      button{
        margin-top:20px;
        padding:12px 25px;
        border:none;
        border-radius:10px;
        background:#00ffcc;
        color:black;
        font-size:18px;
        cursor:pointer;
        font-weight:bold;
      }

      .code{
        margin-top:20px;
        font-size:30px;
        color:#00ffcc;
        font-weight:bold;
      }

    </style>
  </head>

  <body>

    <div class="box">

      <h1>🤖 AMASHIA MD</h1>

      <p>Connect WhatsApp With Pairing Code</p>

      <input
        type="text"
        id="number"
        placeholder="509XXXXXXXX"
      >

      <br>

      <button onclick="connectBot()">
        CONNECT
      </button>

      <div class="code" id="code"></div>

    </div>

    <script>

      async function connectBot(){

        const number =
          document.getElementById("number").value;

        const res =
          await fetch("/pair?id=" + number + "&number=" + number);

        const data = await res.json();

        document.getElementById("code").innerHTML =
          data.pairing_code || data.error;
      }

    </script>

  </body>
  </html>
  `);
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

// Create New Session API
app.get("/pair", async (req, res) => {

  const id = req.query.id;
  const number = req.query.number;

  if (!id || !number) {

    return res.json({
      error: "Use: /pair?id=user1&number=509XXXXXXXX"
    });
  }

  try {

    if (sessions[id]) {

      return res.json({
        error: "Session already exists"
      });
    }

    logger.info(`🚀 Creating Session ${id}`);

    // Create sessions folder
    if (!fs.existsSync("./sessions")) {
      fs.mkdirSync("./sessions");
    }

    const sessionPath = `./sessions/${id}`;

    // Create individual folder
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
      printQRInTerminal: false
    });

    sessions[id] = sock;

    sock.ev.on("creds.update", saveCreds);

    setTimeout(async () => {

      const code =
        await sock.requestPairingCode(number);

      res.json({
        session: id,
        number: number,
        pairing_code: code
      });

    }, 3000);

  } catch (error) {

    logger.error(error);

    res.json({
      error: "Failed to create session"
    });
  }
});

// Start Main Session
startBot("main").catch(err => {
  logger.error("❌ Fatal error:", err);
});