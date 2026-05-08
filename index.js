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

startBot()