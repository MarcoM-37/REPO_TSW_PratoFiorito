<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { skin, sessione, notifica } from '../../ambiente.js'
import { socket } from '../../socket.js'
import Loading from '../../components/Loading.vue'
import Errore from '../../components/Errore.vue'
import { apiFetch } from '../../api/index.js'

// Stato del giocatore corrente
const stats = ref({ giocate: 0, punti: 0, winrate: 0, valuta: 0 })
const listaAmici = ref([])
const richiesteRicevute = ref([])
const richiesteInviate = ref([])

// Finestre e Caricamenti
const mostraAggiungi = ref(false)
const nomeAmico = ref('')
const errore = ref(null)
const caricamento = ref(false)

// Modale Profilo Amico
const mostraProfiloAmico = ref(false)
const amicoSelezionato = ref({ user: {}, obiettivi: [] })

const caricaDatiProfilo = async (silenzioso = false) => {
  if (!silenzioso) caricamento.value = true
  errore.value = null
  try {
    // Chiamata per le statistiche
    const datiStats = await apiFetch('/api/stats/me')
    const giocate = parseInt(datiStats.user.partite_giocate) || 0
    const vittorie = parseInt(datiStats.user.vittorie_totali) || 0

    stats.value = {
      giocate: giocate,
      punti: datiStats.user.punti_totali,
      winrate: giocate > 0 ? Math.round((vittorie / giocate) * 100) : 0,
      valuta: datiStats.user.valuta,
    }

    // Chiamata per gli amici
    const datiAmici = await apiFetch('/api/amici')
    listaAmici.value = datiAmici.amici
    richiesteRicevute.value = datiAmici.ricevute
    richiesteInviate.value = datiAmici.inviate
  } catch (err) {
    errore.value = err.message
  } finally {
    caricamento.value = false
  }
}

const AggiungiAmico = async () => {
  try {
    const dati = await apiFetch('/api/amici/richiedi', {
      method: 'POST',
      body: JSON.stringify({ nome: nomeAmico.value }),
    })

    notifica.mostra(dati.message)
    mostraAggiungi.value = false
    nomeAmico.value = ''
    caricaDatiProfilo()
  } catch (err) {
    notifica.mostra(err.message)
  }
}

const AzioneAmicizia = async (idAmico, azione, messaggioSuccesso) => {
  try {
    await apiFetch(`/api/amici/${azione}`, {
      method: 'POST',
      body: JSON.stringify({ id_amico: idAmico }),
    })
    notifica.mostra(messaggioSuccesso)
    caricaDatiProfilo()
  } catch (err) {
    console.error('Errore:', err)
  }
}

const VisionaAmico = async (idAmico) => {
  try {
    const dati = await apiFetch(`/api/stats/utente/${idAmico}`)
    amicoSelezionato.value = dati
    mostraProfiloAmico.value = true
  } catch (err) {
    notifica.mostra("Impossibile caricare il profilo dell'amico")
  }
}

// Dichiariamo le funzioni in modo specifico
const aggiornaInBackground = () => caricaDatiProfilo(true)

onMounted(() => {
  caricaDatiProfilo() // Al primo avvio carica normalmente

  // Usiamo la funzione nominata
  socket.on('nuova_richiesta_amicizia', aggiornaInBackground)
  socket.on('amicizia_aggiornata', aggiornaInBackground)
})

onUnmounted(() => {
  // Passando la funzione specifica, spegniamo solo l'ascoltatore di questa pagina
  socket.off('nuova_richiesta_amicizia', aggiornaInBackground)
  socket.off('amicizia_aggiornata', aggiornaInBackground)
})
</script>

<template>
  <div id="main">
    <Loading v-if="caricamento" messaggio="Caricamento profilo..."></Loading>
    <Errore v-else-if="errore" :messaggio="errore" @riprova="caricaDatiProfilo"></Errore>

    <!-- -------------------------------------------HEADER----------------------------------- -->
    <div v-else id="div_profilo" class="finestra">
      <div id="header-profilo">
        <div id="div_nome_icona">
          <div id="div_icona">{{ skin.icona }}</div>
          <span id="nome">{{ sessione.utente?.username }}</span>
        </div>

        <div id="div_statistiche">
          <span
            >Partite giocate: <b>{{ stats.giocate }}</b></span
          >
          <span
            >Punti totali: <b>{{ stats.punti }}</b></span
          >
          <span
            >Winrate: <b>{{ stats.winrate }}%</b></span
          >
          <span
            >Soldi: <b>{{ stats.valuta }} 💰</b></span
          >
        </div>
      </div>

      <!-- ---------------------------------------LISTA AMICI---------------------------------------- -->
      <div id="div_listaAmici">
        <h3>Lista Amici</h3>
        <div id="box_listaAmici">
          <!-- ------------RICHIESTE AMICIZIA--------- -->
          <div v-if="richiesteRicevute.length > 0" class="sezione-amici">
            <h4>Ricevute</h4>
            <div
              v-for="req in richiesteRicevute"
              :key="'req-' + req.id_utente"
              class="amico_row richiesta"
            >
              <span
                ><span class="icona-amico">{{ req.icona }}</span> {{ req.username }}</span
              >
              <div class="bottoni-azione">
                <button
                  class="btn-accetta"
                  @click="AzioneAmicizia(req.id_utente, 'accetta', 'Amicizia accettata!')"
                >
                  ✔️
                </button>
                <button
                  class="btn-rifiuta"
                  @click="AzioneAmicizia(req.id_utente, 'rifiuta', 'Richiesta rifiutata.')"
                >
                  ❌
                </button>
              </div>
            </div>
          </div>
          <!-- -----------------RICHIESTE INVIATE------------ -->
          <div v-if="richiesteInviate.length > 0" class="sezione-amici">
            <h4>In Attesa...</h4>
            <div
              v-for="req in richiesteInviate"
              :key="'inv-' + req.id_utente"
              class="amico_row attesa"
            >
              <span
                ><span class="icona-amico">{{ req.icona }}</span> {{ req.username }}</span
              >
              <button
                class="btn-rifiuta"
                @click="
                  AzioneAmicizia(req.id_utente, 'rifiuta', 'Richiesta annullata con successo.')
                "
              >
                Annulla
              </button>
            </div>
          </div>
          <!-- ----------------LISTA EFFETTIVA---------- -->
          <hr
            v-if="
              (richiesteRicevute.length > 0 || richiesteInviate.length > 0) && listaAmici.length > 0
            "
          />

          <div
            v-for="persona in listaAmici"
            :key="'amico-' + persona.id_utente"
            class="amico_row confermato"
            @click="VisionaAmico(persona.id_utente)"
          >
            <span
              ><span class="icona-amico">{{ persona.icona }}</span> {{ persona.username }}</span
            >

            <div class="bottoni-azione" style="align-items: center">
              <span class="info-hover">🔍 Clicca per ispezionare</span>
              <button
                class="btn-rifiuta"
                title="Rimuovi amico"
                @click.stop="
                  AzioneAmicizia(persona.id_utente, 'rifiuta', 'Amico rimosso dalla tua lista.')
                "
              >
                🗑️
              </button>
            </div>
          </div>
          <!-- -----NO AMICI E NO RICHIESTE----- -->
          <div
            v-if="
              listaAmici.length === 0 &&
              richiesteRicevute.length === 0 &&
              richiesteInviate.length === 0
            "
            class="vuoto"
          >
            Nessun amico trovato.
          </div>
        </div>
        <button class="btn-aggiungi" @click="mostraAggiungi = true">Aggiungi Giocatore</button>
      </div>

      <!-- ------------------AGGIUNGI AMICO-------------------- -->
      <div v-if="mostraAggiungi" id="outer_aggiungiAmico">
        <div id="inner_aggiungiAmico">
          <h3>Invia richiesta:</h3>
          <form @submit.prevent="AggiungiAmico">
            <input v-model="nomeAmico" placeholder="Username del giocatore" required />
            <div class="bottoni-modale">
              <button type="button" class="btn-rifiuta" @click="mostraAggiungi = false">
                Annulla
              </button>
              <button type="submit" class="btn-accetta">Invia</button>
            </div>
          </form>
        </div>
      </div>

      <!-- ----------------------MOSTRA PROFILO AMICO---------------- -->
      <div v-if="mostraProfiloAmico" class="modal-amico-overlay">
        <div class="modal-amico-content">
          <button class="btn-chiudi-amico" @click="mostraProfiloAmico = false">X</button>
          <div class="testata-amico">
            <div class="icona-grande">{{ amicoSelezionato.user.icona }}</div>
            <h2>{{ amicoSelezionato.user.username }}</h2>
          </div>

          <div class="stats-amico">
            <div class="box-stat">
              <span>Partite</span><b>{{ amicoSelezionato.user.partite_giocate }}</b>
            </div>
            <div class="box-stat">
              <span>Vittorie</span
              ><b style="color: #28a745">{{ amicoSelezionato.user.vittorie_totali }}</b>
            </div>
            <div class="box-stat">
              <span>Punti</span
              ><b style="color: #ffcc00">{{ amicoSelezionato.user.punti_totali }}</b>
            </div>
          </div>

          <h4 style="margin-top: 20px">Obiettivi Sbloccati</h4>
          <div class="obiettivi-amico-lista">
            <div v-for="ob in amicoSelezionato.obiettivi" :key="ob.titolo" class="ob-amico">
              <strong>{{ ob.titolo }}</strong>
              <small>{{ new Date(ob.data_sblocco).toLocaleDateString() }}</small>
            </div>
            <p v-if="amicoSelezionato.obiettivi.length === 0" style="color: #888">
              Nessun obiettivo.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
#div_profilo {
  width: 90%;
  max-width: 600px;
  max-height: 78%;
  margin-top: 4%;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

#header-profilo {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 2px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 20px;
}

#div_icona {
  width: 80px;
  height: 80px;
  margin-right: 20px;
  background-color: color-mix(in srgb, var(--bg-color), white 20%);
  border-radius: 10px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 3rem;
}

#nome {
  font-size: 2rem;
  font-weight: bold;
}
#div_nome_icona {
  display: flex;
  align-items: center;
}

#div_statistiche {
  display: flex;
  flex-direction: column;
  text-align: right;
  font-size: 1.1rem;
  color: rgba(255, 255, 255, 0.8);
}

#box_listaAmici {
  display: flex;
  flex-direction: column;
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  padding: 15px;
  margin: 10px 0;
  max-height: 250px;
  overflow-y: auto;
  scrollbar-color: color-mix(in srgb, var(--bg-color), black 50%) var(--bg-color);
}

.sezione-amici h4 {
  margin: 10px 0 5px 0;
  font-size: 0.9rem;
  color: #bbb;
  text-transform: uppercase;
}

.amico_row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background: rgba(255, 255, 255, 0.05);
  margin-bottom: 5px;
  border-radius: 5px;
}

.amico_row.richiesta {
  border-left: 4px solid #007bff;
}
.amico_row.attesa {
  border-left: 4px solid #ffcc00;
  opacity: 0.7;
}
.amico_row.confermato {
  border-left: 4px solid #28a745;
  cursor: pointer;
  transition: background 0.2s;
}
.amico_row.confermato:hover {
  background: rgba(255, 255, 255, 0.15);
}

.icona-amico {
  margin-right: 8px;
  font-size: 1.2rem;
}
.info-hover {
  font-size: 0.8rem;
  opacity: 0.5;
}

.bottoni-azione {
  display: flex;
  gap: 5px;
}

.vuoto {
  text-align: center;
  color: #888;
  padding: 10px;
}

.btn-aggiungi {
  width: 100%;
  padding: 12px;
  font-size: 1.1rem;
  cursor: pointer;
  border-radius: 8px;
  border: none;
  background-color: #333;
  color: white;
}
.btn-aggiungi:hover {
  background-color: #555;
}

.btn-accetta {
  background-color: #28a745;
  color: white;
  border: none;
  padding: 6px 15px;
  border-radius: 4px;
  cursor: pointer;
}
.btn-rifiuta {
  background-color: #dc3545;
  color: white;
  border: none;
  padding: 6px 15px;
  border-radius: 4px;
  cursor: pointer;
}

/* Modale Aggiungi */
#outer_aggiungiAmico {
  background-color: rgba(0, 0, 0, 0.7);
  z-index: 1000;
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
}
#inner_aggiungiAmico {
  background-color: var(--bg-color);
  padding: 30px;
  border-radius: 10px;
  text-align: center;
}
#inner_aggiungiAmico input {
  padding: 10px;
  margin: 20px 0;
  width: 100%;
  border-radius: 5px;
  border: none;
  font-size: 1rem;
}
.bottoni-modale {
  display: flex;
  gap: 10px;
  justify-content: space-between;
}
.bottoni-modale button {
  flex: 1;
  padding: 10px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

.modal-amico-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.8);
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: center;
}
.modal-amico-content {
  background: #222;
  color: white;
  padding: 30px;
  border-radius: 12px;
  width: 90%;
  max-width: 400px;
  position: relative;
  box-shadow: 0 5px 30px rgba(0, 0, 0, 0.5);
}
.btn-chiudi-amico {
  position: absolute;
  top: 10px;
  right: 10px;
  background: none;
  border: none;
  color: white;
  font-size: 1.2rem;
  cursor: pointer;
}
.testata-amico {
  text-align: center;
  margin-bottom: 20px;
}
.icona-grande {
  font-size: 4rem;
  margin-bottom: 10px;
}
.stats-amico {
  display: flex;
  justify-content: space-around;
  background: rgba(255, 255, 255, 0.05);
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
}
.box-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.box-stat span {
  font-size: 0.8rem;
  color: #aaa;
}
.box-stat b {
  font-size: 1.2rem;
}
.obiettivi-amico-lista {
  max-height: 150px;
  overflow-y: auto;
  background: rgba(0, 0, 0, 0.2);
  padding: 10px;
  border-radius: 8px;
}
.ob-amico {
  display: flex;
  justify-content: space-between;
  padding: 5px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}
.ob-amico:last-child {
  border-bottom: none;
}

@media (max-width: 700px) {
  #header-profilo {
    flex-direction: column;
    align-items: center;
    gap: 20px;
  }
  #div_statistiche {
    text-align: center;
  }
}
</style>
