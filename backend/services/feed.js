const db = require('../db/index');

const registraAnnuncio = async (io, { tipo, messaggio, idUtente = null }) => {
    try {
        //Salvataggio nel db
        const query = `
            INSERT INTO global_feed (tipo_evento, messaggio, id_utente) 
            VALUES ($1, $2, $3) RETURNING *`;
        const res = await db.query(query, [tipo, messaggio, idUtente]);

        //Invio tramite socket.io
        io.emit('nuovo_annuncio_global', res.rows[0]);

    } catch (err) {
        console.error("Errore nel feedService:", err);
    }
};

module.exports = { registraAnnuncio };