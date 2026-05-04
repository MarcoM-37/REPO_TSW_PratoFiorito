<script setup>
  import { ref, onMounted, computed} from 'vue'
  import { skin, sessione, notifica } from "../../ambiente.js"
  const API_URL = import.meta.env.VITE_SOCKET_URL;

  const listaAcquisti=ref([])
  const errore = ref(null)

  const temi = computed(() => listaAcquisti.value.filter(p => p.tipo === 'tema'));
  const sfondi = computed(() => listaAcquisti.value.filter(p => p.tipo === 'sfondo'));
  const icone = computed(() => listaAcquisti.value.filter(p => p.tipo === 'icona'));
  
  const caricaOggettiAcquistati = async () => {
    try {
      // Recuperiamo il token di sicurezza
      const token = localStorage.getItem('token_campo_minato');
      
      // Se l'utente non è loggato, blocchiamo la funzione
      if (!token || !sessione.utente) return;

      // Chiamiamo la rotta passando il token per farci riconoscere
      const response = await fetch(`${API_URL}/api/shop/mio`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Errore nel caricamento dell\'inventario')
      
      const dati = await response.json()
      
      // Il server di auth.js ci risponde con "inventario"
      listaAcquisti.value = dati.inventario
      console.log("Inventario personale caricato correttamente:", listaAcquisti.value)
    } catch (err) {
      errore.value = err.message
      console.error(err)
    }
  }

  const attivaOggetto = (item) => {
    if(item.tipo=="tema") skin.cambiaTema(item.asset_url);
    else if (item.tipo=="sfondo") skin.cambiaSfondo(`url('${item.asset_url}')`);
    else if (item.tipo=="icona") skin.cambiaIcona(item.asset_url);
    notifica.mostra(`Hai equipaggiato: ${item.nome}`);
  }

  onMounted(caricaOggettiAcquistati)      //per caricare la lista degli oggetti acquistati (NOTA: al momento carica la lista di tutti gli item)
</script>

<template>
  <div id="main">
    <div id="finestra_shop" class="finestra">

      <div id="div_temi">
        <h2>Temi:</h2>
        <div class="riga_oggetti">
          <div class="slot_oggetto" id="tema_base">
            <div class="anteprima" 
              :style="{ backgroundColor: '#42b9af' }" 
              :class="{'selezionato': skin.temaPrincipale === '#42b9af'}"
              @click="attivaOggetto({id:'tema_base', tipo:'tema', nome:'Verde Persiano', asset_url:'#42b9af'})">
            </div>
            <span>Verde Persiano</span>
            <span>(BASE)</span>
          </div>
          <div v-for="item in temi" :key="item.id" class="slot_oggetto">
            <div class="anteprima" 
            :style="{ backgroundColor: item.asset_url }" 
            :class="{'selezionato': skin.temaPrincipale===item.asset_url}"
            @click="attivaOggetto(item)"></div>
            <span>{{ item.nome }}</span>
          </div>
        </div>
      </div>

      <div id="div_sfondi">
        <h2>Sfondi:</h2>
        <div class="riga_oggetti">
          <div class="slot_oggetto" id="sfondo_base">
            <div class="anteprima" 
              :style="{ 
                backgroundImage: `url('/pattern/sfondo_base.jpg')`, 
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }"
              :class="{'selezionato': skin.sfondoURL.includes('sfondo_base.jpg')}"
              @click="attivaOggetto({id:'sfondo_base', tipo:'sfondo', nome:'Mattoncini Grigi', asset_url:'/pattern/sfondo_base.jpg'})">
            </div>
            <span>Mattoncini Grigi</span>
            <span>(BASE)</span>
          </div>
          <div v-for="item in sfondi" :key="item.id" class="slot_oggetto">
            <div class="anteprima" 
              :style="{ 
                backgroundImage: `url(${item.asset_url})`, 
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }" 
              :class="{'selezionato':skin.sfondoURL.includes(item.asset_url)}"
              @click="attivaOggetto(item)"></div>
            <span>{{ item.nome }}</span>
          </div>
        </div>
      </div>

      <div id="div_icone">
        <h2>Icone Profilo:</h2>
        <div class="riga_oggetti">
          <div class="slot_oggetto" id="icona_base">
            <div class="anteprima anteprima_icone" 
              :class="{'selezionato': skin.icona === '🎭'}"
              @click="attivaOggetto({id:'icona_base', tipo:'icona', nome:'Maschere', asset_url:'🎭'})">
              🎭
            </div>
            <span>Maschere</span>
            <span>(BASE)</span>
          </div>
          <div v-for="item in icone" :key="item.id" class="slot_oggetto">
            <div class="anteprima anteprima_icone" 
              :class="{'selezionato': skin.icona===item.asset_url}"
              @click="attivaOggetto(item)">
              {{ item.asset_url }}
            </div>
            <span>{{ item.nome }}</span>
          </div>
        </div>
      </div>

    </div>   
  </div>
</template>


<style scoped>
  #finestra_shop{
    margin : 5vh 0;
    width: 40%;
    height: 80%;
  }

  #div_temi,#div_sfondi,#div_icone{
    margin : 10px 10px;
    padding : 10px 10px 0 10px;
    border-radius: 5px;
    background-color: color-mix(in srgb, var(--bg-color), white 20%);
  }

  .riga_oggetti {
    display: flex;
    gap: 15px;
    overflow-x: auto;
    align-items: stretch;
    scrollbar-color : color-mix(in srgb, var(--bg-color), black 50%) color-mix(in srgb, var(--bg-color), white 20%);
    margin-bottom : 2dvh;
    padding-bottom: 2dvh;
  }

  .slot_oggetto {
    width: 7dvw;
    min-width: 140px;
    display: flex;
    flex-direction: column;
    align-items: center;
    flex-shrink: 0;
    margin-top:10px;
    height: auto;
  }

  .slot_oggetto > span {
    text-align: center;
    font-size: 0.95rem;
    margin-bottom: 8px;
    line-height: 1.2;
  }

  .anteprima {
    width: 80px;
    height: 80px;
    border-radius: 8px;
    border: 2px solid #ddd;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
  }

  .anteprima:hover {
    transform: scale(1.05);
    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
  }

  .anteprima_icone {
    font-size: 200%;
    background-color: #f0f0f0;
    user-select: none;
  }

  .selezionato{
    border: solid green 3px;
  }

  @media only screen and (max-width: 800px) {
    .anteprima{
      width: 40px;
      height: 40px;
    }
    #finestra_shop{
      width: 90%;
    }
    .riga_oggetti{
      font-size: 10px;
      gap:0;
    }
    h2{
      font-size: 16px;
    }
  }
</style>