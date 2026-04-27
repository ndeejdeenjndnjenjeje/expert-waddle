const express = require("express");
const app = express();

// MUST be first route
app.get("/", (req, res) => {
  res.send("🚀 Railway is LIVE");
});

// IMPORTANT: Railway port
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("🚀 Server running on port " + PORT);
});