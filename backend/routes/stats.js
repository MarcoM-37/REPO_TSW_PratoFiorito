const express = require("express");
const router = express.Router();
const db = require("../db/index");
const auth = require("../middleware/auth");

// Classifica globale
router.get("/classifica", async (req, res) => {
  try {
    // Prende utente, valuta, conta le partite finite e le vittorie
    const query = `
             SELECT 
                u.username AS nome, 
                u.valuta AS punteggio,
                COUNT(g.id_partita) AS n_partite,
                COALESCE(SUM(CASE WHEN p.stato = 'vinta' THEN 1 ELSE 0 END), 0) AS vittorie,
                COALESCE(SUM(g.secondi_giocati), 0) AS tempo_totale
             FROM utenti u
             LEFT JOIN gioca_in g ON u.id_utente = g.id_utente
             LEFT JOIN partite p ON g.id_partita = p.id_partita AND p.stato IN ('vinta', 'persa')
             GROUP BY u.id_utente, u.username, u.valuta
             ORDER BY u.valuta DESC
             LIMIT 10
         `;

    const result = await db.query(query);

    // Formattiamo i dati esattamente come se li aspetta il frontend
    const classificaFormattata = result.rows.map((user) => {
      const partiteFinite = parseInt(user.n_partite);
      const vittorie = parseInt(user.vittorie);
      const sconfitte = partiteFinite - vittorie;

      // Calcolo del Ratio W/L (Vittorie diviso Sconfitte)
      let ratio = "0.00";
      if (sconfitte === 0 && vittorie > 0) {
        ratio = "100%"; // Imbattuto
      } else if (sconfitte > 0) {
        ratio = (vittorie / sconfitte).toFixed(2);
      }

      const ore = Math.floor(user.tempo_totale / 3600);
      const minuti = Math.floor((user.tempo_totale % 3600) / 60);
      const tempoFormattato = `${ore}h ${minuti}m`;

      return {
        nome: user.nome,
        punteggio: user.punteggio,
        n_partite: partiteFinite,
        ratio: ratio,
        tempo_giocato: tempoFormattato,
      };
    });

    res.json({
      success: true,
      classifica: classificaFormattata, // Nome corretto
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, error: "Errore nel recupero della classifica" });
  }
});

// Statistiche PERSONALI
// Usiamo il middleware perché dobbiamo sapere chi è
router.get("/me", auth, async (req, res) => {
  try {
    // l'id viene estratto dal token
    const idUser = req.user.id;

    const query = `
       SELECT u.username, u.email, u.valuta,
         COUNT(g.id_partita) as partite_giocate,
         COALESCE(SUM(CASE WHEN p.stato = 'vinta' THEN 1 ELSE 0 END), 0) as vittorie_totali,
         COALESCE(SUM(g.punteggio_partita), 0) as punti_totali
       FROM utenti u
       LEFT JOIN gioca_in g ON u.id_utente = g.id_utente
       LEFT JOIN partite p ON g.id_partita = p.id_partita
       WHERE u.id_utente = $1
       GROUP BY u.id_utente, u.username, u.email, u.valuta
    `;

    const result = await db.query(query, [idUser]);

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Utente non trovato" });
    }

    res.json({
      success: true,
      user: result.rows[0],
    });
  } catch (err) {
    console.error("Errore Dettagliato Profilo:", err);
    res
      .status(500)
      .json({ success: false, error: "Errore nel recupero del profilo" });
  }
});

// Rotta per recuperare gli Obiettivi
router.get("/obiettivi", auth, async (req, res) => {
  try {
    const idUser = req.user.id;

    // Prende tutti i traguardi esistenti e, se l'utente li ha sbloccati, ci affianca la data di sblocco.
    const query = `
            SELECT 
                t.id_traguardo, 
                t.titolo, 
                t.descrizione, 
                r.data_sblocco
            FROM traguardi t
            LEFT JOIN raggiunto_da r ON t.id_traguardo = r.id_traguardo AND r.id_utente = $1
            ORDER BY r.data_sblocco DESC NULLS LAST, t.id_traguardo ASC
        `;

    const result = await db.query(query, [idUser]);

    const raggiunti = [];
    const non_raggiunti = [];

    // Dividiamo i risultati nei due array che il frontend si aspetta
    result.rows.forEach((ob) => {
      if (ob.data_sblocco) {
        // Formattiamo la data
        const d = new Date(ob.data_sblocco);
        ob.data_sblocco = d.toLocaleDateString("it-IT");
        raggiunti.push(ob);
      } else {
        non_raggiunti.push(ob);
      }
    });

    res.json({
      success: true,
      raggiunti: raggiunti,
      non_raggiunti: non_raggiunti,
    });
  } catch (err) {
    console.error("Errore recupero obiettivi:", err);
    res.status(500).json({
      success: false,
      error: "Errore nel caricamento degli obiettivi",
    });
  }
});

// Rotta per visionare il profilo di un amico
router.get("/utente/:id", auth, async (req, res) => {
  try {
    const idTarget = req.params.id;

    // Dati Base e Statistiche
    const query = `
            SELECT u.username, u.valuta, COALESCE(n.asset_url, '🎭') as icona,
            (SELECT COUNT(*) FROM gioca_in WHERE id_utente = $1) as partite_giocate,
            (SELECT COUNT(*) FROM gioca_in g JOIN partite p ON g.id_partita = p.id_partita WHERE g.id_utente = $1 AND p.stato = 'vinta') as vittorie_totali,
            (SELECT COALESCE(SUM(punteggio_partita), 0) FROM gioca_in WHERE id_utente = $1) as punti_totali
            FROM utenti u
            LEFT JOIN negozio n ON u.icona_attiva = n.id_oggetto
            WHERE u.id_utente = $1
        `;
    const result = await db.query(query, [idTarget]);

    if (result.rows.length === 0)
      return res.status(404).json({ error: "Utente non trovato" });

    // Obiettivi sbloccati dall'amico
    const queryObiettivi = `
            SELECT t.titolo, t.descrizione, r.data_sblocco
            FROM traguardi t
            JOIN raggiunto_da r ON t.id_traguardo = r.id_traguardo
            WHERE r.id_utente = $1
            ORDER BY r.data_sblocco DESC
        `;
    const obRes = await db.query(queryObiettivi, [idTarget]);

    res.json({ success: true, user: result.rows[0], obiettivi: obRes.rows });
  } catch (err) {
    res.status(500).json({ error: "Errore caricamento profilo" });
  }
});

module.exports = router;
