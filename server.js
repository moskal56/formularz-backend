const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch"); // WAŻNE
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// Dane Twojego repo
const OWNER = "moskal56";
const REPO = "formularz-backend";
const FILE = "orders.json";
const BRANCH = "main";

// Endpoint GET — pobiera aktualny plik z GitHuba
app.get("/orders", async (req, res) => {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_PAT}`,
          Accept: "application/vnd.github+json",
        },
      }
    );

    const data = await response.json();

    if (!data.content) {
      return res.json([]);
    }

    const content = Buffer.from(data.content, "base64").toString();
    const json = JSON.parse(content);

    res.json(json);
  } catch (error) {
    console.error("Błąd GET:", error);
    res.status(500).json({ error: "Błąd pobierania danych" });
  }
});

// Endpoint POST — dodaje zamówienie do GitHuba
app.post("/orders", async (req, res) => {
  try {
    const nowyRekord = req.body;

    // 1. Pobieramy aktualny plik
    const response = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_PAT}`,
          Accept: "application/vnd.github+json",
        },
      }
    );

    const data = await response.json();

    const sha = data.sha;
    const content = data.content
      ? JSON.parse(Buffer.from(data.content, "base64").toString())
      : [];

    // 2. Dodajemy nowy element
    content.push(nowyRekord);

    // 3. Kodujemy i wysyłamy z powrotem do GitHuba
    const newContent = Buffer.from(JSON.stringify(content, null, 2)).toString(
      "base64"
    );

    const update = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_PAT}`,
          Accept: "application/vnd.github+json",
        },
        body: JSON.stringify({
          message: "Dodano nowe zamówienie",
          content: newContent,
          sha: sha,
          branch: BRANCH,
        }),
      }
    );

    const updateResult = await update.json();

    res.json({ status: "OK", github: updateResult });
  } catch (error) {
    console.error("Błąd POST:", error);
    res.status(500).json({ error: "Błąd zapisu danych" });
  }
});

app.listen(4000, () => console.log("Backend działa na porcie 4000"));
