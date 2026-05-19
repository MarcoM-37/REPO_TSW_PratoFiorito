const db = require("../db/index");
const gameLogic = require("../game_logic");
const { creaAnnuncioDiGruppo } = require("../services/feed");
const { aggiornaProgressione } = require("./achievements");

// Salva i progressi
const salvaProgressiGiocatore = async (activeGames, idPartita, idUtente) => {
  const partita = activeGames[idPartita];
  if (partita && partita.giocatori[idUtente]) {
    const datiGioc = partita.giocatori[idUtente];
    try {
      let tempoPassato = 0;
      if (datiGioc.timestampIngresso) {
        tempoPassato = Math.floor(
          (Date.now() - datiGioc.timestampIngresso) / 1000,
        );
      }
      await db.query(
        `UPDATE gioca_in
        SET punteggio_partita = COALESCE(punteggio_partita, 0) + $1,
        bandierine_piazzate = $2,
        secondi_giocati = COALESCE(secondi_giocati, 0) + $3
        WHERE id_partita = $4 AND id_utente = $5`,
        [
          datiGioc.punti,
          datiGioc.bandierine,
          tempoPassato,
          partita.uuid,
          idUtente,
        ],
      );
      datiGioc.tempoAccumulato += tempoPassato;
      datiGioc.punti = 0;
      datiGioc.timestampIngresso = null;
    } catch (err) {
      console.error("Errore salvataggio progressi:", err);
    }
  }
};

// Annuncio fine partita
const inviaAnnuncioFinePartita = async (io, idPartita, partita, esito) => {
  const iconaEsito = esito === "vinta" || esito === "vittoria" ? "🏆" : "💥";
  const testoBase =
    esito === "vinta" || esito === "vittoria"
      ? `Vittoria! Hai completato il campo ${partita.size}x${partita.size}!`
      : `Partita terminata: il campo ${partita.size}x${partita.size} è esploso.`;
  const partecipanti = Object.keys(partita.giocatori);
  await creaAnnuncioDiGruppo(
    io,
    partecipanti,
    "fine_partita",
    `${idPartita}|${iconaEsito} ${testoBase}`,
  );
};

module.exports = (io, socket, activeGames) => {
  socket.on("unisciti_partita", async (dati) => {
    const { idPartita, username, idUtente, azione } = dati;
    let uuidPartita = null;

    if (!idUtente) {
      socket.emit("errore_accesso", "Devi essere loggato per giocare!");
      return;
    }

    // Unisciti ad una partita
    if (azione === "unisciti") {
      if (!activeGames[idPartita]) {
        try {
          const res = await db.query(
            "SELECT * FROM partite WHERE chiave_accesso = $1",
            [idPartita],
          );
          if (res.rows.length > 0) {
            const p = res.rows[0];
            if (p.stato !== "in_corso") {
              const resClassifica = await db.query(
                `SELECT u.username,
                COALESCE(g.punteggio_partita, 0) as punti
                FROM gioca_in g JOIN utenti u ON g.id_utente = u.id_utente
                WHERE g.id_partita = $1
                ORDER BY punti DESC`,
                [p.id_partita],
              );
              socket.emit("partita_terminata", {
                esito: p.stato,
                griglia: p.mappa_config,
                classifica: resClassifica.rows,
                storico: true,
              });
              return;
            } else {
              uuidPartita = p.id_partita;
              const percRipristinata =
                (p.numero_mine / (p.larghezza * p.altezza)) * 100;
              activeGames[idPartita] = {
                uuid: p.id_partita,
                inizio: new Date(p.data_creazione).getTime(),
                size: p.larghezza,
                moltiplicatore: percRipristinata / 10,
                celleScoperte: p.mappa_config
                  ? gameLogic.contaCelleScoperte(p.mappa_config)
                  : 0,
                grid:
                  p.mappa_config ||
                  gameLogic.generateEmptyGrid(p.larghezza, p.altezza),
                totalMines: p.numero_mine,
                isFirstClick: p.is_first_click,
                giocatori: {},
                messaggi: [],
              };
            }
          } else {
            socket.emit(
              "errore_accesso",
              "Errore: La stanza non esiste o è terminata.",
            );
            return;
          }
        } catch (err) {
          console.error(err);
          return;
        }
      } else {
        try {
          const resUUID = await db.query(
            "SELECT id_partita FROM partite WHERE chiave_accesso = $1",
            [idPartita],
          );
          uuidPartita = resUUID.rows[0]?.id_partita;
        } catch (err) {
          console.error(err);
        }
      }

      if (uuidPartita) {
        try {
          await db.query(
            "INSERT INTO gioca_in (id_partita, id_utente, ruolo) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
            [uuidPartita, idUtente, "player"],
          );
        } catch (err) {
          console.error(err);
        }
      }
    }
    // Crea una partita
    else if (azione === "crea") {
      if (!activeGames[idPartita]) {
        const size = parseInt(dati.dimensione) || 10;
        const perc = parseInt(dati.difficolta) || 10;
        const mineTotali = Math.floor(size * size * (perc / 100));

        try {
          const resPartita = await db.query(
            `INSERT INTO partite (chiave_accesso, larghezza, altezza, numero_mine, stato, is_first_click)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id_partita`,
            [idPartita, size, size, mineTotali, "in_corso", true],
          );
          const uuidVero = resPartita.rows[0].id_partita;
          await db.query(
            "INSERT INTO gioca_in (id_partita, id_utente, ruolo) VALUES ($1, $2, $3)",
            [uuidVero, idUtente, "host"],
          );

          activeGames[idPartita] = {
            uuid: uuidVero,
            inizio: Date.now(),
            size: size,
            moltiplicatore: perc / 10,
            celleScoperte: 0,
            grid: gameLogic.generateEmptyGrid(size, size),
            totalMines: mineTotali,
            isFirstClick: true,
            giocatori: {},
            messaggi: [],
          };
        } catch (err) {
          console.error(err);
        }
      }
    }

    socket.join(idPartita);
    let tempoDB = 0,
      puntiDB = 0,
      bandierineDB = 0;
    if (uuidPartita) {
      try {
        const resG = await db.query(
          "SELECT punteggio_partita, bandierine_piazzate, secondi_giocati FROM gioca_in WHERE id_partita = $1 AND id_utente = $2",
          [uuidPartita, idUtente],
        );
        if (resG.rows.length > 0) {
          puntiDB = resG.rows[0].punteggio_partita || 0;
          bandierineDB = resG.rows[0].bandierine_piazzate || 0;
          tempoDB = resG.rows[0].secondi_giocati || 0;
        }
      } catch (err) {}
    }

    if (!activeGames[idPartita].giocatori[idUtente]) {
      activeGames[idPartita].giocatori[idUtente] = {
        username,
        punti: puntiDB,
        bandierine: bandierineDB,
        tempoAccumulato: tempoDB,
        timestampIngresso: Date.now(),
        socketId: socket.id,
      };
    } else {
      activeGames[idPartita].giocatori[idUtente].socketId = socket.id;
      if (!activeGames[idPartita].giocatori[idUtente].timestampIngresso) {
        activeGames[idPartita].giocatori[idUtente].timestampIngresso =
          Date.now();
      }
    }

    socket.datiUtente = { idPartita, idUtente, username };
    io.to(idPartita).emit(
      "messaggio_sistema",
      `${username} si è unito alla partita!`,
    );
    socket.emit("aggiorna_griglia", activeGames[idPartita].grid);
    socket.emit("storico_chat", activeGames[idPartita].messaggi);
    socket.emit("sync_hud", {
      tempo:
        Math.floor(
          (Date.now() -
            activeGames[idPartita].giocatori[idUtente].timestampIngresso) /
            1000,
        ) + activeGames[idPartita].giocatori[idUtente].tempoAccumulato,
      punti: activeGames[idPartita].giocatori[idUtente].punti,
      bandierine: activeGames[idPartita].giocatori[idUtente].bandierine,
    });
  });

  socket.on("mossa_utente", async (dati) => {
    const { idPartita, x, y, azione, idUtente } = dati;
    const partita = activeGames[idPartita];
    let clickIniziale = false;
    if (!partita) return;

    if (azione === "scopri" && partita.isFirstClick) {
      try {
        const res = await db.query(
          "SELECT is_first_click, mappa_config FROM partite WHERE chiave_accesso = $1",
          [idPartita],
        );
        if (res.rows.length > 0 && res.rows[0].is_first_click === false) {
          partita.isFirstClick = false;
          partita.grid = res.rows[0].mappa_config;
        } else {
          clickIniziale = true;
          gameLogic.placeMines(partita.grid, partita.totalMines, x, y);
          gameLogic.calculateNumbers(partita.grid);
          partita.isFirstClick = false;
          await db.query(
            "UPDATE partite SET mappa_config = $1, is_first_click = false WHERE chiave_accesso = $2",
            [JSON.stringify(partita.grid), idPartita],
          );
        }
      } catch (err) {
        return;
      }
    }

    if (azione === "bandierina") {
      gameLogic.toggleFlag(partita.grid, x, y);
      partita.grid[y][x].isFlagged
        ? partita.giocatori[idUtente].bandierine++
        : partita.giocatori[idUtente].bandierine--;
      socket.emit("sync_hud", {
        tempo:
          Math.floor(
            (Date.now() - partita.giocatori[idUtente].timestampIngresso) / 1000,
          ) + partita.giocatori[idUtente].tempoAccumulato,
        punti: partita.giocatori[idUtente].punti,
        bandierine: partita.giocatori[idUtente].bandierine,
      });
      db.query(
        "UPDATE gioca_in SET bandierine_piazzate = $1 WHERE id_partita = $2 AND id_utente = $3",
        [partita.giocatori[idUtente].bandierine, partita.uuid, idUtente],
      ).catch((e) => {});
    } else if (azione === "scopri") {
      if (partita.grid[y][x].isMine) {
        gameLogic.revealAllMines(partita.grid);
        try {
          await db.query(
            "UPDATE utenti SET valuta = valuta + COALESCE(g.punteggio_partita, 0) FROM gioca_in g WHERE utenti.id_utente = g.id_utente AND g.id_partita = $1",
            [partita.uuid],
          );
          await db.query(
            "UPDATE partite SET stato = 'persa', data_fine = NOW(), mappa_config = $1 WHERE id_partita = $2",
            [JSON.stringify(partita.grid), partita.uuid],
          );
          Object.keys(partita.giocatori).forEach((idGioc) =>
            aggiornaProgressione(io, idGioc),
          );
          const resClassifica = await db.query(
            `SELECT u.username,
            COALESCE(g.punteggio_partita, 0) as punti
            FROM gioca_in g JOIN utenti u ON g.id_utente = u.id_utente
            WHERE g.id_partita = $1
            ORDER BY punti DESC`,
            [partita.uuid],
          );
          io.to(idPartita).emit("partita_terminata", {
            esito: "sconfitta",
            griglia: partita.grid,
            classifica: resClassifica.rows,
          });
        } catch (err) {}

        for (const [idGioc, datiGioc] of Object.entries(partita.giocatori)) {
          await salvaProgressiGiocatore(activeGames, idPartita, idGioc);
        }
        await inviaAnnuncioFinePartita(io, idPartita, partita, "persa");
        delete activeGames[idPartita];
        return;
      } else {
        const cellePrima = gameLogic.contaCelleScoperte(partita.grid);
        gameLogic.revealCell(partita.grid, x, y);
        const nuoveScoperte =
          gameLogic.contaCelleScoperte(partita.grid) - cellePrima;

        if (nuoveScoperte > 0) {
          let puntiGuadagnati = 0;
          for (let i = 1; i <= nuoveScoperte; i++) {
            partita.celleScoperte++;
            if (!clickIniziale)
              puntiGuadagnati +=
                Math.log(partita.celleScoperte) * partita.moltiplicatore;
          }
          puntiGuadagnati = Math.round(puntiGuadagnati);
          if (puntiGuadagnati > 0) {
            partita.giocatori[idUtente].punti += puntiGuadagnati;
            socket.emit("sync_hud", {
              tempo:
                Math.floor(
                  (Date.now() - partita.giocatori[idUtente].timestampIngresso) /
                    1000,
                ) + partita.giocatori[idUtente].tempoAccumulato,
              punti: partita.giocatori[idUtente].punti,
              bandierine: partita.giocatori[idUtente].bandierine,
            });
            db.query(
              "UPDATE gioca_in SET punteggio_partita = COALESCE(punteggio_partita, 0) + $1 WHERE id_partita = $2 AND id_utente = $3",
              [puntiGuadagnati, partita.uuid, idUtente],
            ).catch((e) => {});
          }
        }
      }
    }

    if (gameLogic.checkWin(partita.grid, partita.totalMines)) {
      const bonusVittoria = Math.round(
        partita.size * partita.size * partita.moltiplicatore,
      );
      try {
        await db.query(
          "UPDATE gioca_in SET punteggio_partita = COALESCE(punteggio_partita, 0) + $1 WHERE id_partita = $2",
          [bonusVittoria, partita.uuid],
        );
        await db.query(
          "UPDATE utenti SET valuta = valuta + COALESCE(g.punteggio_partita, 0) FROM gioca_in g WHERE utenti.id_utente = g.id_utente AND g.id_partita = $1",
          [partita.uuid],
        );
        await db.query(
          "UPDATE partite SET stato = 'vinta', data_fine = NOW(), mappa_config = $1 WHERE id_partita = $2",
          [JSON.stringify(partita.grid), partita.uuid],
        );
        Object.keys(partita.giocatori).forEach((idGioc) =>
          aggiornaProgressione(io, idGioc),
        );
        const resClassifica = await db.query(
          `SELECT u.username, COALESCE(g.punteggio_partita, 0) as punti
          FROM gioca_in g JOIN utenti u ON g.id_utente = u.id_utente
          WHERE g.id_partita = $1
          ORDER BY punti DESC`,
          [partita.uuid],
        );
        io.to(idPartita).emit("partita_terminata", {
          esito: "vittoria",
          griglia: partita.grid,
          classifica: resClassifica.rows,
          bonus: bonusVittoria,
        });
      } catch (err) {}

      for (const [idGioc, datiGioc] of Object.entries(partita.giocatori)) {
        await salvaProgressiGiocatore(activeGames, idPartita, idGioc);
      }
      await inviaAnnuncioFinePartita(io, idPartita, partita, "vinta");
      delete activeGames[idPartita];
      return;
    }

    db.query("UPDATE partite SET mappa_config = $1 WHERE chiave_accesso = $2", [
      JSON.stringify(partita.grid),
      idPartita,
    ]).catch((e) => {});
    io.to(idPartita).emit("aggiorna_griglia", partita.grid);
  });

  socket.on("lascia_partita", async (dati) => {
    await salvaProgressiGiocatore(activeGames, dati.idPartita, dati.idUtente);
  });

  socket.on("disconnect", async () => {
    if (socket.datiUtente) {
      const { idPartita, idUtente, username } = socket.datiUtente;
      if (
        activeGames[idPartita] &&
        activeGames[idPartita].giocatori[idUtente]
      ) {
        if (activeGames[idPartita].giocatori[idUtente].socketId === socket.id) {
          await salvaProgressiGiocatore(activeGames, idPartita, idUtente);
          io.to(idPartita).emit(
            "messaggio_sistema",
            `${username} si è scollegato.`,
          );
        }
      }
    }
  });

  // Storico Personale
  socket.on("richiedi_storico", async (idUtente) => {
    if (!idUtente) return;
    try {
      const res = await db.query(
        `SELECT p.chiave_accesso, p.stato, p.data_creazione, p.larghezza, p.numero_mine,
        COALESCE(g.punteggio_partita, 0) as punti,
        COALESCE(g.bandierine_piazzate, 0) as bandierine,
        COALESCE(g.secondi_giocati, 0) as durata_secondi
        FROM partite p JOIN gioca_in g ON p.id_partita = g.id_partita
        WHERE g.id_utente = $1
        ORDER BY p.data_creazione DESC`,
        [idUtente],
      );
      socket.emit("storico_ricevuto", res.rows);
    } catch (err) {}
  });
};
