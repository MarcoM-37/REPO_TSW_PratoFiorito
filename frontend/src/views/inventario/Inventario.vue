<script setup>
import { ref, onMounted, computed } from 'vue'
import { skin, sessione, notifica } from '../../ambiente.js'
import Loading from '../../components/Loading.vue'
import Errore from '../../components/Errore.vue'
import SlotInventarioTema from '../../components/SlotInventarioTema.vue'
import SlotInventarioSfondo from '../../components/SlotInventarioSfondo.vue'
import SlotInventarioIcona from '../../components/SlotInventarioIcona.vue'

const API_URL = import.meta.env.VITE_SOCKET_URL

const listaAcquisti = ref([])
const errore = ref(null)
const caricamento = ref(false)

const temi = computed(() => listaAcquisti.value.filter((p) => p.tipo === 'tema'))
const sfondi = computed(() => listaAcquisti.value.filter((p) => p.tipo === 'sfondo'))
const icone = computed(() => listaAcquisti.value.filter((p) => p.tipo === 'icona'))

const caricaOggettiAcquistati = async () => {
  caricamento.value = true
  errore.value = null
  try {
    // Recuperiamo il token di sicurezza
    const token = localStorage.getItem('token_campo_minato')

    // Se l'utente non è loggato, blocchiamo la funzione
    if (!token || !sessione.utente) return

    // Chiamiamo la rotta passando il token per farci riconoscere
    const response = await fetch(`${API_URL}/api/shop/mio`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!response.ok) throw new Error("Errore nel caricamento dell'inventario")

    const dati = await response.json()

    // Il server di auth.js ci risponde con "inventario"
    listaAcquisti.value = dati.inventario
    console.log('Inventario personale caricato correttamente:', listaAcquisti.value)
  } catch (err) {
    errore.value = err.message
    console.error(err)
  } finally {
    caricamento.value = false
  }
}

const attivaOggetto = (item) => {
  if (item.tipo == 'tema') skin.cambiaTema(item.asset_url)
  else if (item.tipo == 'sfondo') skin.cambiaSfondo(`url('${item.asset_url}')`)
  else if (item.tipo == 'icona') skin.cambiaIcona(item.asset_url)
  notifica.mostra(`Hai equipaggiato: ${item.nome}`)
}

onMounted(caricaOggettiAcquistati) //per caricare la lista degli oggetti acquistati (NOTA: al momento carica la lista di tutti gli item)
</script>

<template>
  <div id="main">

    <Loading v-if="caricamento" messaggio="Caricamento inventario..."></Loading>

    <Errore v-else-if="errore" :messaggio="errore"  @riprova="caricaClassifica"></Errore>

    <div v-else id="finestra_shop" class="finestra">
      
      <div id="div_temi">
        <h2>Temi:</h2>
        <div class="riga_oggetti">

          <SlotInventarioTema
            :item="{
              'id' : 'tema_base',
              'nome' : 'Verde Persiano (BASE)',
              'asset_url' : '#42b9af',
              'tipo' : 'tema'
            }"
            @attiva="attivaOggetto">
          </SlotInventarioTema>
          
          <SlotInventarioTema
            v-for="item in temi"
            :item="item"
            @attiva="attivaOggetto">
          </SlotInventarioTema>

        </div>
      </div>

      <div id="div_sfondi">
        <h2>Sfondi:</h2>
        <div class="riga_oggetti">

          <SlotInventarioSfondo
            :item="{
              'id' : 'sfondo_base',
              'nome' : 'Mattoncini Grigi (BASE)',
              'asset_url' : '/pattern/sfondo_base.jpg',
              'tipo' : 'sfondo'
            }"
            @attiva="attivaOggetto">
          </SlotInventarioSfondo>

          <SlotInventarioSfondo
            v-for="item in sfondi"
            :item="item"
            @attiva="attivaOggetto">
          </SlotInventarioSfondo>
          
        </div>
      </div>

      <div id="div_icone">
        <h2>Icone Profilo:</h2>
        <div class="riga_oggetti">

          <SlotInventarioIcona
            :item="{
              'id' : 'icona_base',
              'nome' : 'Maschere (BASE)',
              'asset_url' : '🎭',
              'tipo' : 'icona'
            }"
            @attiva="attivaOggetto">
          </SlotInventarioIcona>
          
          <SlotInventarioIcona
            v-for="item in icone"
            :item="item"
            @attiva="attivaOggetto">
          </SlotInventarioIcona>

        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
#finestra_shop {
  margin: 5vh 0;
  width: 40%;
  height: 80%;
}

#div_temi, #div_sfondi, #div_icone {
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
