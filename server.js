const express = require("express")

const app = express()

app.get("/", (req, res) => {
res.send("AMASHIA MD V1.0.0 IS ONLINE 🚀")
})

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
console.log("SERVER STARTED")
})