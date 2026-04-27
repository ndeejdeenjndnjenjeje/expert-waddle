app.get("/", (req, res) => {
  res.send("Server is running");
});

const express = require("express");
const session = require("express-session");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();


// ================= DB =================
const db = new sqlite3.Database("database.db");

// USERS (SaaS accounts)
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
  )
`);

// SHORT LINKS (upgrade)
db.run(`
  CREATE TABLE IF NOT EXISTS short_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE,
    url TEXT,
    user TEXT,
    expiresAt INTEGER
  )
`);

// ================= MIDDLEWARE =================
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use(
  session({
    secret: "super_secret_key",
    resave: false,
    saveUninitialized: false,
  })
);

// ================= AUTH =================
function requireLogin(req, res, next) {
  if (!req.session.user) return res.redirect("/login");
  next();
}

// ================= HELPERS =================
function generateCode(length = 6) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out = "";
  for (let i = 0; i < length; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

// ================= PAGES =================
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.get("/admin", requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

// ================= SIGNUP (SaaS USERS) =================
app.post("/signup", (req, res) => {
  const { username, password } = req.body;

  db.run(
    "INSERT INTO users (username, password) VALUES (?, ?)",
    [username, password],
    () => res.redirect("/login")
  );
});

// ================= LOGIN =================
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  db.get(
    "SELECT * FROM users WHERE username = ? AND password = ?",
    [username, password],
    (err, user) => {
      if (!user) return res.send("❌ Wrong login");

      req.session.user = username;
      res.redirect("/admin");
    }
  );
});

// ================= CREATE SHORT LINK =================
app.post("/api/shorten", requireLogin, (req, res) => {
  const { url, custom, expiresDays } = req.body;

  const code = custom && custom.trim() !== "" ? custom : generateCode();

  const expiresAt = expiresDays
    ? Date.now() + Number(expiresDays) * 24 * 60 * 60 * 1000
    : null;

  db.run(
    "INSERT INTO short_links (code, url, user, expiresAt) VALUES (?, ?, ?, ?)",
    [code, url, req.session.user, expiresAt],
    () => res.redirect("/admin")
  );
});

// ================= REDIRECT ENGINE =================
app.get("/go/:code", (req, res) => {
  const code = req.params.code;

  db.get(
    "SELECT * FROM short_links WHERE code = ?",
    [code],
    (err, link) => {
      if (!link) return res.status(404).send("Not found");

      // expiration check
      if (link.expiresAt && Date.now() > link.expiresAt) {
        return res.send("⏳ Link expired");
      }

      res.redirect(link.url);
    }
  );
});

// ================= USER LINKS =================
app.get("/api/links", requireLogin, (req, res) => {
  db.all(
    "SELECT * FROM short_links WHERE user = ?",
    [req.session.user],
    (err, rows) => {
      res.json(rows);
    }
  );
});

// ================= START =================
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("🚀 Server running on port " + PORT);
});