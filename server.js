const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();
app.use(cors());
app.use(express.json());

// KONFIG GITHUBA
const OWNER = "moskal56";
const REPO = "formularz-backend";
const FILE_PATH = "orders.json";
const BRANCH = "main";
const TOKEN = process.env.GITHUB_TOKEN; // NAZWA ZMIENNEJ W RENDERZE

if (!TOKEN) {
  console.error("⚠ Brak zmiennej GITHUB_TOKEN w środowisku!");
}

// --- POMOCNICZE FUNKCJE ---

// Pobranie orders.json z GitHuba
async function getOrdersFromGitHub() {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE_PATH}?ref=${BRANCH}`;

  const res = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
    },
  });

  // Jeśli plik nie istnieje → traktujemy jako pustą tablicę
  if (res.status === 404) {
    return { orders: [], sha: null };
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub GET ${res.status}: ${text}`);
  }

  const data = await res.json();
  const decoded = Buffer.from(data.content, "base64").toString("utf8");
  const orders = JSON.parse(decoded || "[]");

  return { orders, sha: data.sha };
}

// Zapis orders.json do GitHuba (PUT + commit)
async function saveOrdersToGitHub(orders, sha) {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`;

  const newContentBase64 = Buffer.from(
    JSON.stringify(orders, null, 2),
    "utf8"
  ).toString("base64");

  const body = {
    message: "Update orders.json via API",
    content: newContentBase64,
    branch: BRANCH,
  };

  if (sha) {
    body.sha = sha; // update istniejącego pliku
  }

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub PUT ${res.status}: ${text}`);
  }

  return res.json();
}

// --- ENDPOINTY ---

// GET /orders — czytaj z GitHuba
app.get("/orders", async (req, res) => {
  try {
    const { orders } = await getOrdersFromGitHub();
    res.json(orders);
  } catch (err) {
    console.error("Błąd GET /orders:", err);
    res.status(500).json({ error: "Błąd pobierania zamówień", details: err.message });
  }
});

// POST /orders — dodaj zamówienie i zapisz w GitHubie
app.post("/orders", async (req, res) => {
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
    console.error("Błąd POST /orders:", err);
    res.status(500).json({ error: "Błąd zapisu zamówienia", details: err.message });
  }
});

// Test root
app.get("/", (req, res) => {
  res.send("API działa 🚀 (GitHub storage)");
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Serwer działa na porcie ${PORT}`);
});
