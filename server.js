// File: server.js
// Dipendenze: npm install express cors pg

const express = require('express');
const cors = require('cors');
const dns = require('dns').promises;
const { Pool } = require('pg');

const app = express();

// Abilitiamo CORS subito
app.use(cors());
app.use(express.json());

// -----------------------------------------
// Configurazione del Database
// -----------------------------------------
const POOLER_HOST = 'aws-0-eu-west-1.pooler.supabase.com';

// IMPORTANT: keep port 6543 for transaction pooler as in your original code
const POOLER_PORT = 6543;

const poolConfig = {
  user: 'postgres.gnpsuzytpytsvngdwxol',
  database: 'postgres',
  password: 'c4TNu$4*5d93R+t',
  port: POOLER_PORT,
};

async function createPool() {
  // Force IPv4 to avoid ENETUNREACH on IPv6
  const lookupRes = await dns.lookup(POOLER_HOST, { family: 4 });

  // dns.lookup can return either a string or an object depending on Node/runtime
  const ip4 =
    typeof lookupRes === 'string'
      ? lookupRes
      : lookupRes && typeof lookupRes.address === 'string'
        ? lookupRes.address
        : null;

  if (!ip4) {
    throw new Error(`Could not resolve IPv4 for ${POOLER_HOST}`);
  }

  return new Pool({
    ...poolConfig,
    host: ip4, // MUST be a string
  });
}

// Initialize once
const poolPromise = createPool();

// -----------------------------------------
// API 1: Registrazione Cliente
// -----------------------------------------
app.post('/api/registrati', async (req, res) => {
  const { nome, email, telefono, consenso_gdpr } = req.body;

  if (!consenso_gdpr) {
    return res.status(400).json({ errore: 'Il consenso alla privacy è obbligatorio.' });
  }

  try {
    const pool = await poolPromise;

    const query = `
      INSERT INTO clienti (nome, email, telefono, consenso_gdpr)
      VALUES ($1, $2, $3, $4) RETURNING *
    `;
    const values = [nome, email, telefono, consenso_gdpr];

    await pool.query(query, values);

    res
      .status(201)
      .json({ messaggio: 'Registrazione avvenuta con successo! Mostra questa schermata in cassa.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ errore: 'Errore durante la registrazione. Forse sei già iscritto?' });
  }
});

// -----------------------------------------
// API 2: Ottieni lista clienti (Admin)
// -----------------------------------------
app.get('/api/clienti', async (req, res) => {
  try {
    const pool = await poolPromise;

    const { rows } = await pool.query(
      'SELECT id, nome, email, telefono, data_registrazione FROM clienti ORDER BY data_registrazione DESC'
    );

    res.status(200).json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ errore: 'Impossibile recuperare i clienti.' });
  }
});

// -----------------------------------------
// API 3: Invia Campagna (Admin)
// -----------------------------------------
app.post('/api/invia-messaggio', async (req, res) => {
  const { tipo, messaggio } = req.body;

  console.log(`Simulazione invio ${tipo}: ${messaggio}`);
  res.status(200).json({ messaggio: `Campagna ${tipo} inviata con successo!` });
});

// -----------------------------------------
// Avvio del Server
// -----------------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server del bar avviato e in ascolto sulla porta ${PORT}`);
});
