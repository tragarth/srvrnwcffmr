// File: server.js
// Dipendenze: npm install express cors pg

const express = require('express');
const cors = require('cors'); // <-- 1. Importiamo CORS
const { Pool } = require('pg');

const app = express();

// <-- 2. ABILITIAMO CORS SUBITO (Prima di qualsiasi altra cosa)
// Questo dice al server: "Accetta richieste anche se arrivano da porte diverse"
app.use(cors()); 

// Permette al server di leggere i dati in formato JSON
app.use(express.json());

// -----------------------------------------
// Configurazione del Database (Supabase o altro)
// -----------------------------------------
const pool = new Pool({
  user: 'postgres.gnpsuzytpytsvngdwxol',
  host: 'aws-0-eu-west-1.pooler.supabase.com',
  database: 'postgres',
  password: 'c4TNu$4*5d93R+t',
  port: 6543,
});

// -----------------------------------------
// API 1: Registrazione Cliente (dal QR Code)
// -----------------------------------------
app.post('/api/registrati', async (req, res) => {
    const { nome, email, telefono, consenso_gdpr } = req.body;

    if (!consenso_gdpr) {
        return res.status(400).json({ errore: "Il consenso alla privacy è obbligatorio." });
    }

    try {
        const query = `
            INSERT INTO clienti (nome, email, telefono, consenso_gdpr) 
            VALUES ($1, $2, $3, $4) RETURNING *
        `;
        const values = [nome, email, telefono, consenso_gdpr];
        
        await pool.query(query, values);
        res.status(201).json({ messaggio: "Registrazione avvenuta con successo! Mostra questa schermata in cassa." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ errore: "Errore durante la registrazione. Forse sei già iscritto?" });
    }
});

// -----------------------------------------
// API 2: Ottieni lista clienti (per l'Admin)
// -----------------------------------------
app.get('/api/clienti', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT id, nome, email, telefono, data_registrazione FROM clienti ORDER BY data_registrazione DESC');
        res.status(200).json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ errore: "Impossibile recuperare i clienti." });
    }
});

// -----------------------------------------
// API 3: Invia Campagna (per l'Admin)
// -----------------------------------------
app.post('/api/invia-messaggio', async (req, res) => {
    const { tipo, messaggio } = req.body;
    
    // Logica futura per Brevo/Twilio
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