const db = require("../db/index");

// Annuncio a tutto il server
const creaAnnuncioGlobale = async (io, tipo, messaggio) => {
  try {
    const query =
      "INSERT INTO global_feed (tipo_evento, messaggio, id_utente) VALUES ($1, $2, NULL) RETURNING *";
    const res = await db.query(query, [tipo, messaggio]);
    io.emit("nuovo_annuncio_global", res.rows[0]);
  } catch (err) {
    console.error("Errore creaAnnuncioGlobale:", err);
  }
};

// Annuncio a un singolo giocatore
const creaAnnuncioPersonale = async (io, idDestinatario, tipo, messaggio) => {
  try {
    const query =
      "INSERT INTO global_feed (tipo_evento, messaggio, id_utente) VALUES ($1, $2, $3) RETURNING *";
    const res = await db.query(query, [tipo, messaggio, idDestinatario]);
    io.to(`utente_${idDestinatario}`).emit(
      "nuovo_annuncio_global",
      res.rows[0],
    );
  } catch (err) {
    console.error("Errore creaAnnuncioPersonale:", err);
  }
};

// Annuncio a un gruppo specifico
const creaAnnuncioDiGruppo = async (io, arrayDestinatari, tipo, messaggio) => {
  if (!arrayDestinatari || arrayDestinatari.length === 0) return;
  try {
    // Inserimento nel db
    const values = arrayDestinatari
      .map((_, i) => `($1, $2, $${i + 3})`)
      .join(", ");
    const params = [tipo, messaggio, ...arrayDestinatari];
    const query = `INSERT INTO global_feed (tipo_evento, messaggio, id_utente) VALUES ${values} RETURNING *`;

    const res = await db.query(query, params);

    // Inviamo l'annuncio a tutte le stanze contemporaneamente
    const stanzeDestinatari = arrayDestinatari.map((id) => `utente_${id}`);
    io.to(stanzeDestinatari).emit("nuovo_annuncio_global", res.rows[0]);
  } catch (err) {
    console.error("Errore creaAnnuncioDiGruppo:", err);
  }
};

module.exports = {
  creaAnnuncioGlobale,
  creaAnnuncioPersonale,
  creaAnnuncioDiGruppo,
};
