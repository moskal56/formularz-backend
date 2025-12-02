// server.js
const express = require('express');
const cors = require('cors');

const app = express();

// pozwól na JSON w body
app.use(express.json());

// pozwól na zapytania z przeglądarki (CORS)
app.use(cors());

// "baza danych" w pamięci (na razie tylko do nauki)
let orders = [];

// GET /api/orders - zwróć wszystkie zamówienia
app.get('/api/orders', (req, res) => {
  res.json(orders);
});

// POST /api/orders - dodaj nowe zamówienie
app.post('/api/orders', (req, res) => {
  const { imie, nazwisko, budzet, data } = req.body;

  // prosta walidacja
  if (!imie || !nazwisko || !budzet || !data) {
    return res.status(400).json({ error: 'Brak wymaganych pól' });
  }

  const newOrder = {
    id: Date.now(), // proste ID
    imie,
    nazwisko,
    budzet,
    data,
  };

  orders.push(newOrder);

  res.status(201).json(newOrder);
});

// prosty endpoint testowy
app.get('/', (req, res) => {
  res.send('API działa 🚀');
});

// PORT z Render / lokalnie 4000
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Serwer działa na porcie ${PORT}`);
});
