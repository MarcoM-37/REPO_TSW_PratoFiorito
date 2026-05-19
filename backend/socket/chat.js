const db = require("../db/index");
const { creaAnnuncioPersonale } = require("../services/feed");

module.exports = (io, socket, activeGames) => {
  // Gestione Invio Messaggi Chat Stanza
  socket.on("invia_messaggio_chat", async (dati) => {
    const { idPartita, idUtente, username, icona, testo } = dati;

    if (activeGames[idPartita]) {
      const nuovoMessaggio = {
        autore: username,
        icona: icona || "🎭",
        testo: testo,
        ora: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      try {
        const resPartita = await db.query(
          "SELECT id_partita FROM partite WHERE chiave_accesso = $1",
          [idPartita],
        );
        if (resPartita.rows.length > 0) {
          const uuidPartita = resPartita.rows[0].id_partita;
          await db.query(
            "INSERT INTO messaggi (id_partita, id_utente, testo) VALUES ($1, $2, $3)",
            [uuidPartita, idUtente, testo],
          );
        }
      } catch (err) {
        console.error("Errore salvataggio messaggio:", err);
      }

      // Salva in RAM e spedisce a tutti
      activeGames[idPartita].messaggi.push(nuovoMessaggio);
      io.to(idPartita).emit("nuovo_messaggio_chat", nuovoMessaggio);
    }
  });

  // Gestione Inviti tra Amici
  socket.on("invia_invito_partita", async (dati) => {
    const { idDestinatario, idPartita, username } = dati;
    const msg = `${idPartita}|${username} ti ha invitato a unirti alla sua partita!`;
    await creaAnnuncioPersonale(io, idDestinatario, "invito_partita", msg);
  });

  // Gestione Storico Annunci Personali/Globali al Login
  socket.on("richiedi_annunci", async () => {
    try {
      const res = await db.query(
        "SELECT * FROM global_feed WHERE id_utente IS NULL OR id_utente = $1 ORDER BY creato_il DESC LIMIT 30",
        [socket.user.id],
      );
      socket.emit("storico_annunci", res.rows);
    } catch (err) {
      console.error("Errore recupero annunci: ", err);
    }
  });
};
