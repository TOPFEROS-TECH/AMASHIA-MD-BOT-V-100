const express = require("express");
require("dotenv").config();

const app = express();

app.get("/", (req, res) => {
  res.send("🤖 AMASHIA MD V1.0.0 IS ONLINE 🚀");
});

app.get("/status", (req, res) => {
  res.json({
    status: "online",
    bot: "AMASHIA MD V1.0.0"
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`✅ SERVER STARTED ON PORT ${PORT}`);
});