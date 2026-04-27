const express = require("express");
const session = require("express-session");
const bcrypt = require("bcrypt");
const fs = require("fs");

const app = express();

// 🚀 IMPORTANT: Railway port fix
const PORT = process.env.PORT || 3000;

const ADMIN_USER = "admin";
const ADMIN_PASSWORD = "admin123";

const DATA_FILE = "links.json";

app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use(
  session({
    secret: "change_this_secret",
    resave: false,
    saveUninitialized: false,
  })
);

// ---------- safe DB ----------
function loadLinks() {
  try {
    if (!fs.existsSync(DATA_FILE)) return [];
    return JSON.parse(fs.readFileSync(DATA_FILE));
  } catch (e) {
    return [];
  }
}

function saveLinks(links) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(links, null, 2));
}

// ---------- auth ----------
let passwordHash = bcrypt.hashSync(ADMIN_PASSWORD, 10);

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
app.get("/", (req, res) => {
  res.send("🚀 Server is running");
});

app.get("/api/links", (req, res) => {
  res.json(loadLinks());
});

app.post("/api/add", requireLogin, (req, res) => {
  const { name, url } = req.body;
  const links = loadLinks();
  links.push({ name, url });
  saveLinks(links);
  res.send("Added");
});

app.post("/api/delete", requireLogin, (req, res) => {
  const { index } = req.body;
  let links = loadLinks();
  links.splice(index, 1);
  saveLinks(links);
  res.send("Deleted");
});

// 🚀 Railway safe listen
app.listen(PORT, "0.0.0.0", () => {
  console.log("🚀 Running on port " + PORT);
});