const express = require("express");
const session = require("express-session");
const bcrypt = require("bcrypt");
const fs = require("fs");

const app = express();
const PORT = 3000;

// change this later
const ADMIN_USER = "admin";
const ADMIN_PASSWORD = "admin123"; // first run only

// simple file DB
const DATA_FILE = "links.json";

app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use(session({
  secret: "change_this_secret",
  resave: false,
  saveUninitialized: false
}));

// ---------- helpers ----------
function loadLinks() {
  if (!fs.existsSync(DATA_FILE)) return [];
  return JSON.parse(fs.readFileSync(DATA_FILE));
}

function saveLinks(links) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(links, null, 2));
}

// ---------- auth ----------
let passwordHash = null;

// create hash on startup (simpler for Windows)
bcrypt.hash(ADMIN_PASSWORD, 10).then(hash => {
  passwordHash = hash;
  console.log("✅ Password ready");
});

// login
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (username !== ADMIN_USER) {
    return res.status(401).send("Wrong login");
  }

  const match = await bcrypt.compare(password, passwordHash);

  if (!match) {
    return res.status(401).send("Wrong login");
  }

  req.session.user = username;
  res.send("Logged in");
});

// logout
app.get("/logout", (req, res) => {
  req.session.destroy();
  res.send("Logged out");
});

// middleware
function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.status(401).send("Login required");
  }
  next();
}

// ---------- routes ----------

// public links
app.get("/api/links", (req, res) => {
  res.json(loadLinks());
});

// add link
app.post("/api/add", requireLogin, (req, res) => {
  const { name, url } = req.body;

  const links = loadLinks();
  links.push({ name, url });
  saveLinks(links);

  res.send("Added");
});

// delete link
app.post("/api/delete", requireLogin, (req, res) => {
  const { index } = req.body;

  let links = loadLinks();
  links.splice(index, 1);
  saveLinks(links);

  res.send("Deleted");
});

app.listen(PORT, () => {
  console.log("🌐 http://localhost:3000");
});