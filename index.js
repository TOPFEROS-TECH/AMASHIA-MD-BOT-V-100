const {
default: makeWASocket,
useMultiFileAuthState
} = require("@whiskeysockets/baileys")

const express = require("express")
const P = require("pino")

const app = express()

app.get("/", (req, res) => {
res.send("AMASHIA MD BOT ONLINE 🚀")
})

app.listen(3000, () => {
console.log("Server Started")
})

async function startBot() {

const { state, saveCreds } =
await useMultiFileAuthState("./session")

const sock = makeWASocket({
auth: state,
logger: P({ level: "silent" }),
browser: ["AMASHIA MD", "Chrome", "1.0.0"]
})

sock.ev.on("creds.update", saveCreds)

console.log("BOT STARTED 🚀")
}
sock.ev.on("messages.upsert", async ({ messages }) => {

const m = messages[0]

if (!m.message) return

const from = m.key.remoteJid

const text =
m.message.conversation ||
m.message.extendedTextMessage?.text || ""

if (text === ".menu") {

await sock.sendMessage(from, {

image: {
url: "https://drive.google.com/uc?export=view&id=1-ONk_ZlyFGy3ne7rmZJkwk-8pcwB9WMJ"
},

caption:
`🤖 AMASHIA MD V1.0.0

Bienvenue sur AMASHIA MD BOT ⚡

📌 Commandes disponibles :

.play
.tiktok
.lyrics
.trad
.save
.antidelete
.antispam

🚀 MADE IN TOPFEROS TECH`

})

}

})
startBot()