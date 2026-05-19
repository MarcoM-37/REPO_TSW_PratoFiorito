const db = require("../db/index");

// Funzione per sbloccare un obiettivo singolo
const controllaObiettivo = async (io, idUtente, codiceSblocco) => {
  try {
    const resTraguardo = await db.query(
      "SELECT id_traguardo, titolo, descrizione FROM traguardi WHERE codice_sblocco = $1",
      [codiceSblocco],
    );
    if (resTraguardo.rows.length === 0) return;

    const traguardo = resTraguardo.rows[0];

    const resInsert = await db.query(
      `
        INSERT INTO raggiunto_da (id_utente, id_traguardo) 
        VALUES ($1, $2) 
        ON CONFLICT (id_utente, id_traguardo) DO NOTHING 
        RETURNING *
      `,
      [idUtente, traguardo.id_traguardo],
    );

    if (resInsert.rows.length > 0) {
      io.to(`utente_${idUtente}`).emit("obiettivo_sbloccato", {
        titolo: traguardo.titolo,
        descrizione: traguardo.descrizione,
      });
    }
  } catch (err) {
    console.error("Errore sblocco obiettivo:", err);
  }
};

// Motore di progressione
const aggiornaProgressione = async (io, idUtente) => {
  try {
    const statsQuery = `
      SELECT 
        u.valuta,
        (SELECT COUNT(*) FROM gioca_in g JOIN partite p ON g.id_partita = p.id_partita WHERE g.id_utente = u.id_utente AND p.stato = 'vinta') as vittorie,
        (SELECT COUNT(*) FROM gioca_in g JOIN partite p ON g.id_partita = p.id_partita WHERE g.id_utente = u.id_utente AND p.stato = 'persa') as sconfitte,
        (SELECT COUNT(*) FROM inventario WHERE id_utente = u.id_utente) as oggetti
      FROM utenti u WHERE u.id_utente = $1
    `;
    const resStats = await db.query(statsQuery, [idUtente]);
    if (resStats.rows.length === 0) return;

    const stats = resStats.rows[0];
    const partiteTotali = parseInt(stats.vittorie) + parseInt(stats.sconfitte);
    const resTraguardi = await db.query("SELECT * FROM traguardi");

    for (let t of resTraguardi.rows) {
      let sbloccato = false;

      if (
        t.codice_sblocco.startsWith("win_") &&
        parseInt(stats.vittorie) >= t.requisito_valore
      )
        sbloccato = true;
      if (
        t.codice_sblocco.startsWith("lose_") &&
        parseInt(stats.sconfitte) >= t.requisito_valore
      )
        sbloccato = true;
      if (
        t.codice_sblocco.startsWith("play_") &&
        partiteTotali >= t.requisito_valore
      )
        sbloccato = true;
      if (
        t.codice_sblocco.startsWith("get_") &&
        parseInt(stats.valuta) >= t.requisito_valore
      )
        sbloccato = true;
      if (
        t.codice_sblocco.startsWith("buy_") &&
        parseInt(stats.oggetti) >= t.requisito_valore
      )
        sbloccato = true;

      if (sbloccato) {
        const resInsert = await db.query(
          `
            INSERT INTO raggiunto_da (id_utente, id_traguardo) 
            VALUES ($1, $2) ON CONFLICT (id_utente, id_traguardo) DO NOTHING RETURNING *
          `,
          [idUtente, t.id_traguardo],
        );

        if (resInsert.rows.length > 0) {
          io.to(`utente_${idUtente}`).emit("obiettivo_sbloccato", {
            titolo: t.titolo,
            descrizione: t.descrizione,
          });
        }
      }
    }
  } catch (err) {
    console.error("Errore aggiornamento progressione:", err);
  }
};

module.exports = { controllaObiettivo, aggiornaProgressione };
