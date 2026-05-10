<script setup>
import Header from '@/components/Header.vue'
import { skin, notifica, toast, sessione, sfx } from '@/ambiente.js'
import { socket } from '@/socket.js'
import { ref, watch, onMounted } from 'vue'

//Per il feed
const feedAperto = ref(false);
const annunci = ref([]);
const notificheFeed = ref(0);

const apriFeed = () => {
     feedAperto.value = !feedAperto.value;
     notificheFeed.value = 0; // Azzera le notifiche quando apri
};

onMounted(() => {
  // 1. Se c'è un utente loggato, accendiamo il Socket in tutto il sito
  if (sessione.utente) {
    socket.auth = { token: localStorage.getItem('token_campo_minato') }
    socket.connect()
    socket.emit('richiedi_annunci'); //Chiede gli annunci passati
  }

  //Ricezione dello storico al login
  socket.on('storico_annunci', (dati) => {
       annunci.value = dati;
  });

  //Ricezione di un annuncio in diretta
  socket.on('nuovo_annuncio_global', (annuncio) => {
       annunci.value.unshift(annuncio);
       if (!feedAperto.value) notificheFeed.value++;
       if (annunci.value.length > 30) annunci.value.pop(); //Limitiamoli a 30
  });

  // 2. Restiamo in ascolto se il server ci sblocca un obiettivo
  socket.on('obiettivo_sbloccato', (dati) => {
    // 1. Facciamo partire il suono
    sfx.play('obiettivo.wav')

    // 2. Mostriamo il popup a schermo
    toast.mostra(dati.titolo, dati.descrizione)
  })

  document.addEventListener('click', (evento) => {
    // Se l'elemento cliccato (o il suo contenitore) è un bottone, fai click
    if (evento.target.closest('button')) {
      sfx.play('click.wav')
    }
  })
})

//Se l'utente fa login senza ricaricare la pagina, ricarichiamo il feed
watch(() => sessione.utente, (nuovoUtente) => {
  if (nuovoUtente) {
    socket.emit('richiedi_annunci');
  } else {
    annunci.value = [];
  }
});
</script>

<template>
  <div id="ambiente">
    <Header />
    <main>
      <RouterView />
    </main>

    <div v-if="notifica.visibile" class="modal-overlay-alert">
      <div class="modal-alert">
        <p>{{ notifica.messaggio }}</p>
        <button class="btn-ok" @click="notifica.chiudi()">OK</button>
      </div>
    </div>

    <div v-if="toast.visibile" class="toast-container">
      <div class="toast-content">
        <div class="toast-icona">🏆</div>
        <div class="toast-testo">
          <h4>{{ toast.titolo }}</h4>
          <p>{{ toast.descrizione }}</p>
        </div>
        <button class="toast-chiudi" @click="toast.chiudi()">X</button>
      </div>
    </div>

    <div v-if="sessione.utente">
      <button id="btn-feed" @click="apriFeed">
        📢 Annunci
        <span v-if="notificheFeed > 0" class="badge-notifica">{{ notificheFeed }}</span>
      </button>

      <div id="sidebar-feed" :class="{ aperta: feedAperto }">
        <div class="header-feed">
          <h3>Feed Globale</h3>
          <button class="btn-chiudi-feed" @click="feedAperto = false">X</button>
        </div>

        <div class="area-annunci">
          <div v-for="annuncio in annunci" :key="annuncio.id_evento" class="annuncio-card" :class="annuncio.tipo_evento">
            <small class="ora">{{ new Date(annuncio.creato_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }}</small>
            <span class="tipo-badge">{{ annuncio.tipo_evento.replace('_', ' ').toUpperCase() }}</span>
            <p>{{ annuncio.messaggio }}</p>
          </div>
          <div v-if="annunci.length === 0" class="vuoto">Nessun annuncio recente.</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
#ambiente {
  --bg-color: v-bind('skin.temaPrincipale');
  --bg-pattern: v-bind('skin.sfondoURL');
  --icona: v-bind('skin.icona');
}

.modal-overlay-alert {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999; /* Sta sopra a qualsiasi altra cosa */
}

.modal-alert {
  background-color: #fff;
  color: #333;
  padding: 25px 30px;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  min-width: 300px;
  max-width: 80%;
  animation: comparsa 0.2s ease-out;
}

.modal-alert p {
  font-size: 1.2rem;
  margin-bottom: 20px;
  font-weight: 500;
}

.modal-alert .btn-ok {
  background-color: var(--bg-color, #42b9af);
  color: white;
  border: none;
  padding: 10px 30px;
  font-size: 1.1rem;
  border-radius: 6px;
  cursor: pointer;
  transition: filter 0.2s;
}

.modal-alert .btn-ok:hover {
  filter: brightness(0.9);
}

@keyframes comparsa {
  from {
    transform: scale(0.8);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.toast-container {
  position: fixed;
  top: 80px; /* Sotto l'header */
  right: 20px;
  z-index: 10000;
  animation: slideIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.toast-content {
  background: linear-gradient(135deg, #2c3e50, #1a252f);
  color: white;
  border-left: 5px solid #f1c40f;
  padding: 15px 20px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 15px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);
  min-width: 250px;
  max-width: 350px;
}

.toast-icona {
  font-size: 2rem;
}

.toast-testo h4 {
  margin: 0 0 5px 0;
  font-size: 1.1rem;
  color: #f1c40f;
}

.toast-testo p {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.3;
}

.toast-chiudi {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  font-size: 1.2rem;
  cursor: pointer;
  margin-left: auto;
  align-self: flex-start;
}

.toast-chiudi:hover {
  color: white;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* --- STILI FEED GLOBALE --- */
#btn-feed {
  position: fixed;
  bottom: 20px;
  right: 20px;
  padding: 15px 20px;
  font-size: 1.2rem;
  background-color: #ffd700;
  color: #333;
  font-weight: bold;
  border-radius: 50px;
  border: none;
  cursor: pointer;
  z-index: 1000;
  box-shadow: 0 4px 10px rgba(0,0,0,0.3);
}

.badge-notifica {
  background: red;
  color: white;
  border-radius: 50%;
  padding: 2px 8px;
  font-size: 0.9rem;
  position: absolute;
  top: -5px;
  right: -5px;
}

#sidebar-feed {
  position: fixed;
  top: 0;
  right: -350px;
  width: 350px;
  height: 100vh;
  background-color: #f4f4f4;
  box-shadow: -5px 0 15px rgba(0, 0, 0, 0.2);
  transition: right 0.3s ease-in-out;
  display: flex;
  flex-direction: column;
  z-index: 1001;
}

#sidebar-feed.aperta { right: 0; }

.header-feed {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background-color: #333;
  color: white;
}

.btn-chiudi-feed {
  background: none;
  border: none;
  color: white;
  font-size: 1.2rem;
  cursor: pointer;
}

.area-annunci {
  flex: 1;
  padding: 15px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.annuncio-card {
  background: white;
  padding: 10px;
  border-radius: 8px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
  border-left: 4px solid #333;
}

.annuncio-card p {
  margin: 5px 0 0 0;
  color: #333;
}

.ora {
  color: #888;
  margin-right: 10px;
}

.tipo-badge {
  font-size: 0.7rem;
  background: #333;
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
}

/* Colori in base all'evento */
.annuncio-card.vittoria { border-left-color: #28a745; }
.annuncio-card.vittoria .tipo-badge { background: #28a745; }

.annuncio-card.nuovo_utente { border-left-color: #6f42c1; }
.annuncio-card.nuovo_utente .tipo-badge { background: #6f42c1; }
</style>
