const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs"); //per maggiore sicurezza
const jwt = require("jsonwebtoken"); //invece dei cookie
const db = require("../db/index"); //ponte al db
const { creaAnnuncioGlobale } = require("../services/feed");

//REGISTRAZIONE
router.post("/signup", async (req, res) => {
  const { username, email, password } = req.body;

  //Validazione
  if (!username || !email || !password) {
    return res
      .status(400)
      .json({ success: false, error: "Tutti i campi sono obbligatori" });
  }
  if (password.length < 8) {
    return res.status(400).json({
      success: false,
      error: "La password deve contenere almeno 8 caratteri",
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res
      .status(400)
      .json({ success: false, error: "Formato email non valido" });
  }

  try {
    //Cryptiamo la password
    const sale = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, sale);

    //Inserimao nel DB
    const query = `
            INSERT INTO utenti (username, email, hashword, valuta) 
            VALUES ($1, $2, $3, $4) 
            RETURNING id_utente, username, email
        `;

    const result = await db.query(query, [username, email, hash, 0]);

    const newUser = result.rows[0];

    //Generiamo il token
    const token = jwt.sign({ id: newUser.id_utente }, process.env.JWT_SECRET, {
      expiresIn: "24h",
    });

    res.status(201).json({
      success: true,
      message: "Registrazione riuscita",
      token,
      user: {
        id: newUser.id_utente,
        username: newUser.username,
        email: newUser.email,
        valuta: 0,
        tema: "#42b9af",
        sfondo: "/pattern/sfondo_base.jpg",
        icona: "🎭",
      },
    });

    // Avvisiamo tutto il server del nuovo iscritto
    const io = req.app.get("socketio");
    await creaAnnuncioGlobale(
      io,
      "nuovo_utente",
      `Diamo il benvenuto a ${username}! ✨`,
    );
  } catch (err) {
    if (err.code === "23505") {
      //Errore Chiave Duplicata di Postgres
      return res
        .status(400)
        .json({ success: false, error: "Email o Username già esistenti" });
    }
    console.error(err);
    res
      .status(500)
      .json({ success: false, error: "Errore interno del server" });
  }
});

//LOGIN
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    //Cerchiamo l'utente e facciamo JOIN con il negozio per i link degli oggetti
    const query = `
        SELECT u.*, 
               t.asset_url as tema_url, 
               s.asset_url as sfondo_url, 
               i.asset_url as icona_url
        FROM utenti u
        LEFT JOIN negozio t ON u.skin_attiva = t.id_oggetto
        LEFT JOIN negozio s ON u.sfondo_attivo = s.id_oggetto
        LEFT JOIN negozio i ON u.icona_attiva = i.id_oggetto
        WHERE u.email = $1
    `;
    const result = await db.query(query, [email]);
    const user = result.rows[0];

    if (!user)
      return res
        .status(401)
        .json({ success: false, error: "Credenziali non valide" });

    //Confrontiamo la password
    const giusto = await bcrypt.compare(password, user.hashword);
    if (!giusto)
      return res
        .status(401)
        .json({ success: false, error: "Credenziali non valide" });

    //Generiamo il token
    const token = jwt.sign({ id: user.id_utente }, process.env.JWT_SECRET, {
      expiresIn: "24h",
    });

    res.json({
      success: true,
      token,
      user: {
        id: user.id_utente,
        username: user.username,
        email: user.email,
        valuta: user.valuta,
        tema: user.tema_url || "#42b9af",
        sfondo: user.sfondo_url || "/pattern/sfondo_base.jpg",
        icona: user.icona_url || "🎭",
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: "Errore nel login" });
  }
});

module.exports = router;
