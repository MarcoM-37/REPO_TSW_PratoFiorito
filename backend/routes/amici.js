const express = require("express");
const router = express.Router();
const db = require("../db/index");
const auth = require("../middleware/auth");
const { creaAnnuncioPersonale } = require("../services/feed");

// Ottieni lista amici, richieste ricevute e richieste inviate
router.get("/", auth, async (req, res) => {
  try {
    const idUser = req.user.id;

    // Amici confermati
    const amiciQuery = `
            SELECT u.id_utente, u.username, COALESCE(n.asset_url, '🎭') as icona
            FROM amicizie a
            JOIN utenti u ON (a.id_utente1 = u.id_utente OR a.id_utente2 = u.id_utente)
            LEFT JOIN negozio n ON u.icona_attiva = n.id_oggetto
            WHERE (a.id_utente1 = $1 OR a.id_utente2 = $1) 
            AND a.stato = 'accettata' AND u.id_utente != $1
        `;
    const amiciRes = await db.query(amiciQuery, [idUser]);

    // Richieste Ricevute
    const ricevuteQuery = `
            SELECT u.id_utente, u.username, COALESCE(n.asset_url, '🎭') as icona
            FROM amicizie a
            JOIN utenti u ON a.id_utente1 = u.id_utente
            LEFT JOIN negozio n ON u.icona_attiva = n.id_oggetto
            WHERE a.id_utente2 = $1 AND a.stato = 'in_attesa'
        `;
    const ricevuteRes = await db.query(ricevuteQuery, [idUser]);

    // Richieste Inviate (In attesa)
    const inviateQuery = `
            SELECT u.id_utente, u.username, COALESCE(n.asset_url, '🎭') as icona
            FROM amicizie a
            JOIN utenti u ON a.id_utente2 = u.id_utente
            LEFT JOIN negozio n ON u.icona_attiva = n.id_oggetto
            WHERE a.id_utente1 = $1 AND a.stato = 'in_attesa'
        `;
    const inviateRes = await db.query(inviateQuery, [idUser]);

    res.json({
      success: true,
      amici: amiciRes.rows,
      ricevute: ricevuteRes.rows,
      inviate: inviateRes.rows,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: "Errore caricamento amici" });
  }
});

// Invia richiesta di amicizia
router.post("/richiedi", auth, async (req, res) => {
  try {
    const idMittente = req.user.id;
    const { nome } = req.body;

    if (!nome) return res.status(400).json({ error: "Inserisci un nome" });

    const mittenteRes = await db.query(
      "SELECT username FROM utenti WHERE id_utente = $1",
      [idMittente],
    );
    const mittenteUsername = mittenteRes.rows[0].username;

    const destRes = await db.query(
      "SELECT id_utente FROM utenti WHERE username = $1",
      [nome],
    );
    if (destRes.rows.length === 0)
      return res.status(404).json({ error: "Utente non trovato" });

    const idDestinatario = destRes.rows[0].id_utente;
    if (idMittente === idDestinatario)
      return res.status(400).json({ error: "Non puoi aggiungerti da solo!" });

    const checkRes = await db.query(
      "SELECT * FROM amicizie WHERE (id_utente1 = $1 AND id_utente2 = $2) OR (id_utente1 = $2 AND id_utente2 = $1)",
      [idMittente, idDestinatario],
    );
    if (checkRes.rows.length > 0)
      return res
        .status(400)
        .json({ error: "Richiesta già inviata o siete già amici" });

    await db.query(
      "INSERT INTO amicizie (id_utente1, id_utente2, stato) VALUES ($1, $2, 'in_attesa')",
      [idMittente, idDestinatario],
    );

    const io = req.app.get("socketio");

    await creaAnnuncioPersonale(
      io,
      idDestinatario,
      "richiesta_amicizia",
      `Hai ricevuto una richiesta di amicizia da ${mittenteUsername}!`,
    );

    io.to(`utente_${idDestinatario}`).emit("nuova_richiesta_amicizia", {
      mittente: mittenteUsername,
    });

    res.json({ success: true, message: "Richiesta inviata!" });
  } catch (err) {
    res.status(500).json({ error: "Errore invio richiesta" });
  }
});

// Accetta richiesta
router.post("/accetta", auth, async (req, res) => {
  try {
    const idUser = req.user.id;
    const { id_amico } = req.body;

    await db.query(
      "UPDATE amicizie SET stato = 'accettata' WHERE id_utente1 = $1 AND id_utente2 = $2",
      [id_amico, idUser],
    );

    // Avvisiamo l'altro giocatore che abbiamo accettato
    const io = req.app.get("socketio");
    io.to(`utente_${id_amico}`).emit("amicizia_aggiornata");

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Errore accettazione" });
  }
});

// Rifiuta / Rimuovi amico
router.post("/rifiuta", auth, async (req, res) => {
  try {
    const idUser = req.user.id;
    const { id_amico } = req.body;

    await db.query(
      "DELETE FROM amicizie WHERE (id_utente1 = $1 AND id_utente2 = $2) OR (id_utente1 = $2 AND id_utente2 = $1)",
      [id_amico, idUser],
    );

    // Avvisiamo l'altro giocatore che lo stato è cambiato (rifiutato o rimosso)
    const io = req.app.get("socketio");
    io.to(`utente_${id_amico}`).emit("amicizia_aggiornata");

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Errore rimozione" });
  }
});

module.exports = router;
