// backend/server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
require("dotenv").config(); // Assicura che le var d'ambiente siano caricate all'avvio

// Importazione moduli Socket.io separati
const {
  controllaObiettivo,
  aggiornaProgressione,
} = require("./socket/achievements");
const setupChatHandlers = require("./socket/chat");
const setupGameHandlers = require("./socket/game");

const app = express();
const server = http.createServer(app);

// Configurazione CORS Sicura
const corsOptions = {
  origin: [
    "http://localhost:5173",
    "https://minesweepermmo.onrender.com",
    "https://minesweepermmo.netlify.app",
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.static(path.join(__dirname, "../frontend")));

// Inizializzazione rest api
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, error: "Troppi tentativi, riprova più tardi." },
});
app.use("/api/auth", authLimiter, require("./routes/auth"));
app.use("/api/stats", require("./routes/stats"));
app.use("/api/amici", require("./routes/amici"));
app.use("/api/shop", require("./routes/shop"));

// Inizializzazione socket.io
const io = new Server(server, { cors: corsOptions });
app.set("socketio", io);

// Memoria centrale (RAM) per le partite attive
const activeGames = {};

// Middleware Socket
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error("Autenticazione richiesta"));
  try {
    socket.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    next(new Error("Token non valido o scaduto"));
  }
});

// Smistamento Eventi Socket
io.on("connection", (socket) => {
  console.log(`🔌 Giocatore connesso: ${socket.user.id}`);

  // Stanza personale per ricevere le notifiche dirette
  socket.join(`utente_${socket.user.id}`);

  // Controllo traguardi al login
  controllaObiettivo(io, socket.user.id, "crea_account");
  aggiornaProgressione(io, socket.user.id);

  // Ascoltatori per gli achievement chiamati dal frontend
  socket.on("sblocca_singolo", (codice) =>
    controllaObiettivo(io, socket.user.id, codice),
  );
  socket.on("aggiorna_progressione", () =>
    aggiornaProgressione(io, socket.user.id),
  );

  // Deleghiamo la logica complessa ai file dedicati
  setupChatHandlers(io, socket, activeGames);
  setupGameHandlers(io, socket, activeGames);
});

// Avvio server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server in ascolto sulla porta ${PORT}`);
});
