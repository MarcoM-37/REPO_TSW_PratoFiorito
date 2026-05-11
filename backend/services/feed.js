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
  try {
    for (const idUtente of arrayDestinatari) {
      const query =
        "INSERT INTO global_feed (tipo_evento, messaggio, id_utente) VALUES ($1, $2, $3) RETURNING *";
      const res = await db.query(query, [tipo, messaggio, idUtente]);
      io.to(`utente_${idUtente}`).emit("nuovo_annuncio_global", res.rows[0]);
    }
  } catch (err) {
    console.error("Errore creaAnnuncioDiGruppo:", err);
  }
};

module.exports = {
  creaAnnuncioGlobale,
  creaAnnuncioPersonale,
  creaAnnuncioDiGruppo,
};
