<script setup>
import { ref, onMounted, onUnmounted, computed, reactive } from 'vue'
import { skin, sessione, notifica, playerMusicale } from '../../ambiente.js'
import { socket } from '../../socket.js'
import { apiFetch } from '../../api/index.js'
import Loading from '../../components/Loading.vue'
import Errore from '../../components/Errore.vue'
import SlotShopTema from '../../components/SlotShopTema.vue'
import SlotShopSfondo from '../../components/SlotShopSfondo.vue'
import SlotShopIcona from '../../components/SlotShopIcona.vue'
import SlotShopMusica from '../../components/SlotShopMusica.vue'

const listaOggetti = ref([])
const listaAcquisti = ref([])
const errore = ref(null)
const caricamento = ref(false)

const temi = computed(() => listaOggetti.value.filter((p) => p.tipo === 'tema'))
const sfondi = computed(() => listaOggetti.value.filter((p) => p.tipo === 'sfondo'))
const icone = computed(() => listaOggetti.value.filter((p) => p.tipo === 'icona'))
const musiche = computed(() => listaOggetti.value.filter((p) => p.tipo === 'musica'))

// Inizializziamo lo stato originale dell'utente
const statoOriginale = reactive({
  tema: skin.temaPrincipale,
  sfondo: skin.sfondoURL,
  icona: skin.icona,
})

// Teniamo traccia di cosa sta provando l'utente
const inProva = reactive({
  tema: null,
  sfondo: null,
  icona: null,
  musica: null,
})

// Il lettore audio usa e getta per le anteprime dello Shop
const audioAnteprima = new Audio()
audioAnteprima.volume = 0.5

const caricaOggettiAcquistati = async () => {
  caricamento.value = true
  try {
    const dati = await apiFetch('/api/shop/mio')
    listaAcquisti.value = dati.inventario.map((item) => item.id_oggetto)
  } catch (err) {
    errore.value = err.message
  } finally {
    caricamento.value = false
  }
}

const caricaShop = async () => {
  caricamento.value = true
  try {
    const dati = await apiFetch('/api/shop/oggetti')
    listaOggetti.value = dati.items
  } catch (err) {
    errore.value = err.message
  } finally {
    caricamento.value = false
  }
}

const aggiornaSaldo = async () => {
  try {
    const dati = await apiFetch('/api/stats/me')
    sessione.utente.valuta = dati.user.valuta
    sessione.setUtente(sessione.utente)
  } catch (err) {
    console.error('Impossibile aggiornare il saldo:', err)
  }
}

// Logica di prova e ripristino
const gestisciProva = (item) => {
  // Logica speciale per la musica
  if (item.tipo === 'musica') {
    if (inProva.musica === item.id_oggetto) {
      ripristina('musica') // Se era già in play, lo stoppiamo
    } else {
      ripristina('musica') // Fermiamo eventuali altre anteprime in corso

      // Mettiamo in pausa il Jukebox globale nell'Header se stava suonando
      if (playerMusicale.inRiproduzione) playerMusicale.pausa()

      inProva.musica = item.id_oggetto
      audioAnteprima.src = item.asset_url
      audioAnteprima.currentTime = 0
      audioAnteprima.play().catch((err) => console.warn(err))

      // Controlliamo il timer ogni frazione di secondo
      audioAnteprima.ontimeupdate = () => {
        if (audioAnteprima.currentTime >= 10) {
          ripristina('musica') // Raggiunti i 10 secondi, spegniamo tutto
        }
      }

      // Nel caso in cui la traccia duri meno di 10 secondi
      audioAnteprima.onended = () => ripristina('musica')
    }
    return // Usciamo dalla funzione per non far scattare il codice di Temi/Sfondi
  }

  // Se stavamo già provando questo oggetto, lo ripristiniamo
  if (inProva[item.tipo] === item.id_oggetto) {
    ripristina(item.tipo)
  } else {
    // Altrimenti lo proviamo e salviamo l'ID
    inProva[item.tipo] = item.id_oggetto
    if (item.tipo == 'tema') skin.cambiaTema(item.asset_url)
    else if (item.tipo == 'sfondo') skin.cambiaSfondo(`url('${item.asset_url}')`)
    else if (item.tipo == 'icona') skin.cambiaIcona(item.asset_url)
  }
}

const ripristina = (tipo) => {
  inProva[tipo] = null // Rimuoviamo lo stato di prova
  if (tipo === 'musica') {
    audioAnteprima.pause()
    audioAnteprima.currentTime = 0
    audioAnteprima.ontimeupdate = null
    return
  }
  if (tipo === 'tema') skin.cambiaTema(statoOriginale.tema)
  if (tipo === 'sfondo') skin.cambiaSfondo(statoOriginale.sfondo)
  if (tipo === 'icona') skin.cambiaIcona(statoOriginale.icona)
}

// Logica per equipaggiare un oggetto già posseduto o appena acquistato
const equipaggiaOggetto = (item) => {
  if (item.tipo == 'tema') {
    skin.cambiaTema(item.asset_url)
    statoOriginale.tema = item.asset_url
  } else if (item.tipo == 'sfondo') {
    skin.cambiaSfondo(`url('${item.asset_url}')`)
    statoOriginale.sfondo = `url('${item.asset_url}')`
  } else if (item.tipo == 'icona') {
    skin.cambiaIcona(item.asset_url)
    statoOriginale.icona = item.asset_url
  }
  inProva[item.tipo] = null
  notifica.mostra('Oggetto equipaggiato!')

  // Invia il salvataggio al Database in background
  const token = localStorage.getItem('token_campo_minato')
  if (token) {
    fetch(`/api/shop/equipaggia`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id_oggetto: item.id_oggetto, tipo: item.tipo }),
    }).catch((err) => console.error('Errore salvataggio DB:', err))
  }
}

const effettuaAcquisto = async (item) => {
  if (sessione.utente.valuta < item.prezzo) {
    notifica.mostra('Non hai abbastanza monete per acquistare questo oggetto!')
    return
  }

  try {
    await apiFetch('/api/shop/acquista', {
      method: 'POST',
      body: JSON.stringify({ id_oggetto: item.id_oggetto }),
    })

    listaAcquisti.value.push(item.id_oggetto)
    sessione.utente.valuta -= item.prezzo
    sessione.setUtente(sessione.utente)
    equipaggiaOggetto(item)
    socket.emit('aggiorna_progressione')
    if (item.tipo === 'musica') playerMusicale.aggiornaLibreria()
    notifica.mostra('Acquisto completato con successo!')
  } catch (err) {
    notifica.mostra(err.message)
  }
}

// Carichiamo tutto all'avvio
onUnmounted(() => {
  // Se qualcosa era rimasto in prova, ripristiniamo la fotografia originale
  if (inProva.tema) ripristina('tema')
  if (inProva.sfondo) ripristina('sfondo')
  if (inProva.icona) ripristina('icona')
  if (inProva.musica) ripristina('musica')
})

const avvioShop = async () => {
  errore.value = null
  caricaShop()
  if (sessione.utente) {
    caricaOggettiAcquistati()
    aggiornaSaldo()
  }
}

onMounted(avvioShop)
</script>

<template>
  <div id="main">
    <Loading v-if="caricamento" messaggio="Caricamento shop..."></Loading>

    <Errore v-else-if="errore" :messaggio="errore" @riprova="avvioShop"></Errore>

    <div v-else id="finestra_shop" class="finestra">
      <!-- --------------------------SALDO----------------------- -->
      <div id="div_soldi">
        <!-- Controlla se l'utente esiste, altrimenti mostra 0 -->
        <label>Saldo disponibile : {{ sessione.utente ? sessione.utente.valuta : 0 }} 💰</label>
      </div>

      <!-- -------------------TEMI------------------------------ -->
      <div id="div_temi">
        <h2>Temi:</h2>
        <div class="riga_oggetti">
          <SlotShopTema
            v-for="item in temi"
            :item="item"
            :listaAcquisti="listaAcquisti"
            :inProva="inProva"
            @prova="gestisciProva"
            @equipaggia="equipaggiaOggetto"
            @acquisto="effettuaAcquisto"
          >
          </SlotShopTema>
        </div>
      </div>

      <!-- -------------------SFONDI------------------------------ -->
      <div id="div_sfondi">
        <h2>Sfondi:</h2>
        <div class="riga_oggetti">
          <SlotShopSfondo
            v-for="item in sfondi"
            :item="item"
            :listaAcquisti="listaAcquisti"
            :inProva="inProva"
            @prova="gestisciProva"
            @equipaggia="equipaggiaOggetto"
            @acquisto="effettuaAcquisto"
          >
          </SlotShopSfondo>
        </div>
      </div>

      <!-- -------------------ICONE------------------------------ -->
      <div id="div_icone">
        <h2>Icone:</h2>
        <div class="riga_oggetti">
          <SlotShopIcona
            v-for="item in icone"
            :item="item"
            :listaAcquisti="listaAcquisti"
            :inProva="inProva"
            @prova="gestisciProva"
            @equipaggia="equipaggiaOggetto"
            @acquisto="effettuaAcquisto"
          >
          </SlotShopIcona>
        </div>
      </div>

      <!-- -------------------MUSICHE------------------------------ -->
      <div id="div_musiche">
        <h2>Tracce Musicali:</h2>
        <div class="riga_oggetti">
          <SlotShopMusica
            v-for="item in musiche"
            :item="item"
            :listaAcquisti="listaAcquisti"
            :inProva="inProva"
            @prova="gestisciProva"
            @acquisto="effettuaAcquisto"
          >
          </SlotShopMusica>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
#finestra_shop {
  width: 90%;
  max-width: 800px;
  height: fit-content;
}

#div_soldi {
  font-size: large;
  font-weight: bold;
  box-sizing: border-box;
  text-align: right;
  padding: 10px;
  width: 100%;
  position: sticky;
  top: 0;
  background-color: var(--bg-color);
}

#div_temi,
#div_sfondi,
#div_icone,
#div_musiche {
  margin: 10px 10px;
  padding: 10px 10px 0 10px;
  border-radius: 5px;
  background-color: color-mix(in srgb, var(--bg-color), white 20%);
}

.riga_oggetti {
  display: flex;
  gap: 15px;
  overflow-x: auto;
  align-items: stretch;
  scrollbar-color: color-mix(in srgb, var(--bg-color), black 50%)
    color-mix(in srgb, var(--bg-color), white 20%);
  margin-bottom: 2dvh;
  padding-bottom: 2dvh;
}

@media only screen and (max-width: 800px) {
  .anteprima {
    width: 40px;
    height: 40px;
  }
  #finestra_shop {
    width: 90%;
  }
  .riga_oggetti {
    font-size: 10px;
    gap: 0;
  }
  h2 {
    font-size: 16px;
  }
}
</style>
