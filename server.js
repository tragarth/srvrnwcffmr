// File: server.js
// Dipendenze: npm install express cors pg nodemailer

const express = require('express');
const cors = require('cors');
const dns = require('dns').promises;
const { Pool } = require('pg');
const nodemailer = require('nodemailer');

const app = express();

// Abilitiamo CORS subito
app.use(cors());
app.use(express.json());

// -----------------------------------------
// Configurazione del Database
// -----------------------------------------
const POOLER_HOST = 'aws-0-eu-west-1.pooler.supabase.com';
const POOLER_PORT = 6543;

const poolConfig = {
  user: 'postgres.gnpsuzytpytsvngdwxol',
  database: 'postgres',
  password: 'c4TNu$4*5d93R+t',
  port: POOLER_PORT,
};

async function createPool() {
  const lookupRes = await dns.lookup(POOLER_HOST, { family: 4 });
  const ip4 =
    typeof lookupRes === 'string'
      ? lookupRes
      : lookupRes && typeof lookupRes.address === 'string'
        ? lookupRes.address
        : null;

  if (!ip4) throw new Error(`Could not resolve IPv4 for ${POOLER_HOST}`);

  return new Pool({
    ...poolConfig,
    host: ip4,
  });
}

const poolPromise = createPool();

// -----------------------------------------
// Configurazione Email (Postino Brevo)
// -----------------------------------------
const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false, // IMPORTANT for 587
  auth: {
    user: 'a9b81d001@smtp-brevo.com',
    pass: 'xsmtpsib-19004745ecae1623b011b4e25c02c3310e32332ed63f615da6b3ca7499761285-lQKBv376UubtnOk',
  },
});

if (!'a9b81d001@smtp-brevo.com' || !'xsmtpsib-19004745ecae1623b011b4e25c02c3310e32332ed63f615da6b3ca7499761285-lQKBv376UubtnOk') {
  console.warn(
    '⚠️ Missing Brevo SMTP credentials. Set BREVO_SMTP_USER and BREVO_SMTP_PASS in Render env vars.'
  );
}

// -----------------------------------------
// API 1: Registrazione Cliente
// -----------------------------------------
app.post('/api/registrati', async (req, res) => {
  const { nome, email, telefono, consenso_gdpr } = req.body;

  if (!consenso_gdpr) {
    return res.status(400).json({ errore: 'Il consenso alla privacy è obbligatorio.' });
  }

  if (!email) {
    return res.status(400).json({ errore: 'Email mancante.' });
  }

  try {
    const pool = await poolPromise;

    const query = `
      INSERT INTO clienti (nome, email, telefono, consenso_gdpr)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email)
      DO UPDATE SET
        nome = EXCLUDED.nome,
        telefono = EXCLUDED.telefono,
        consenso_gdpr = EXCLUDED.consenso_gdpr
      RETURNING *;
    `;
    const values = [nome, email, telefono, consenso_gdpr];

    await pool.query(query, values);

    res
      .status(201)
      .json({ messaggio: 'Registrazione avvenuta con successo! Mostra questa schermata in cassa.' });
  } catch (err) {
    console.error('Errore registrazione:', err);
    res.status(500).json({
      errore: 'Errore durante la registrazione.',
      dettaglio: String(err?.message || err),
    });
  }
});

// -----------------------------------------
// API 2: Ottieni lista clienti (Admin)
// -----------------------------------------
app.get('/api/clienti', async (req, res) => {
  const passwordInserita = req.headers.authorization;
  if (passwordInserita !== 'golf7R') {
    return res.status(401).json({ errore: 'Accesso negato! Password errata.' });
  }

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
  const passwordInserita = req.headers.authorization;
  if (passwordInserita !== 'golf7R') {
    return res.status(401).json({ errore: 'Accesso negato! Non puoi inviare messaggi.' });
  }

  const { tipo, messaggio } = req.body;

  try {
    const pool = await poolPromise;

    if (tipo === 'email') {
      const { rows } = await pool.query(
        'SELECT email FROM clienti WHERE email IS NOT NULL AND consenso_gdpr = true'
      );

      const listaEmail = rows.map((cliente) => cliente.email).filter(Boolean);

      if (listaEmail.length === 0) {
        return res.status(400).json({ errore: 'Nessun cliente trovato o nessuno ha dato il consenso.' });
      }

      const from = process.env.BREVO_FROM;
      const campaignTo = process.env.CAMPAIGN_TO;

      if (!from || !campaignTo) {
        return res.status(500).json({
          errore: 'Mancano variabili env: BREVO_FROM e/o CAMPAIGN_TO.',
        });
      }

      await transporter.sendMail({
        from,
        to: campaignTo,     // destinatario test
        bcc: listaEmail,    // destinatari reali in BCC
        subject: 'Novità e Sconti dal tuo Bar!',
        text: messaggio,
      });

      console.log(`Email inviata a ${listaEmail.length} clienti.`);
      return res
        .status(200)
        .json({ messaggio: `Campagna Email inviata a ${listaEmail.length} clienti!` });

    } else if (tipo === 'sms') {
      console.log(`Simulazione SMS: ${messaggio}`);
      return res.status(200).json({ messaggio: 'Simulazione: SMS non ancora configurato.' });
    }

    return res.status(400).json({ errore: 'Tipo campagna non valido.' });
  } catch (err) {
    console.error('Errore invio campagna:', err);
    res.status(500).json({ errore: 'Errore durante l\'invio della campagna.', dettaglio: String(err?.message || err) });
  }
});

// -----------------------------------------
// Avvio del Server
// -----------------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server del bar avviato e in ascolto sulla porta ${PORT}`);
});
