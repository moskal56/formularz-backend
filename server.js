const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();

app.use(express.json());
app.use(cors());

// Konfiguracja GitHub
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OWNER = "moskal56";
const REPO = "formularz-backend";
const FILE_PATH = "orders.json";
const BRANCH = "main";

// Pobieranie pliku z GitHuba
async function getOrdersFromGitHub() {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE_PATH}?ref=${BRANCH}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
    },
  });

  if (res.status === 404) {
    return { orders: [], sha: null };
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub GET error (${res.status}): ${text}`);
  }

  const data = await res.json();
  const decoded = Buffer.from(data.content, "base64").toString("utf8");
  const orders = JSON.parse(decoded || "[]");

  return { orders, sha: data.sha };
}

// Zapisywanie pliku na GitHubie
async function saveOrdersToGitHub(orders, sha) {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`;
  const newContent = Buffer.from(JSON.stringify(orders, null, 2)).toString("base64");

  const body = {
    message: "Update orders.json via API",
    content: newContent,
    branch: BRANCH,
  };

  if (sha) body.sha = sha;

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub PUT error (${res.status}): ${text}`);
  }

  return await res.json();
}

// GET – pobieranie zamówień
app.get("/api/orders", async (req, res) => {
  try {
    const { orders } = await getOrdersFromGitHub();
    res.json(orders);
  } catch (err) {
    console.error("Błąd GET /api/orders:", err.message);
    res.status(500).json({ error: "Błąd pobierania zamówień" });
  }
});

// POST – dodawanie zamówienia
app.post("/api/orders", async (req, res) => {
  try {
    const { imie, nazwisko, budzet, data } = req.body;

    if (!imie || !nazwisko || !budzet || !data) {
      return res.status(400).json({ error: "Brak wymaganych pól" });
    }

    const { orders, sha } = await getOrdersFromGitHub();

    const newOrder = {
      id: Date.now(),
      imie,
      nazwisko,
      budzet,
      data,
    };

    const updatedOrders = [...orders, newOrder];

    await saveOrdersToGitHub(updatedOrders, sha);

    res.status(201).json(newOrder);
  } catch (err) {
    console.error("Błąd POST /api/orders:", err.message);
    res.status(500).json({ error: "Błąd zapisu zamówienia" });
  }
});

// test
app.get("/", (req, res) => {
  res.send("API działa 🚀 (GitHub Storage Enabled)");
});

// PORT
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Serwer działa na porcie ${PORT}`));
