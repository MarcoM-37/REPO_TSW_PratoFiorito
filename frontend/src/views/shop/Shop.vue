<script setup>
  import { ref, onMounted, computed} from 'vue'
  import { skin, sessione } from "../../ambiente.js"
  const API_URL = import.meta.env.VITE_SOCKET_URL;

  const listaOggetti=ref([])
  const listaAcquisti=ref([])   //contiene gli id di tutti gli item acquistati, di tali item non verrà visualizzato il prezzo ma solo "ACQUISTATO"
  const errore = ref(null)

  const temi = computed(() => listaOggetti.value.filter(p => p.tipo === 'tema'));
  const sfondi = computed(() => listaOggetti.value.filter(p => p.tipo === 'sfondo'));
  const icone = computed(() => listaOggetti.value.filter(p => p.tipo === 'icona'));
  
  const caricaOggettiAcquistati = async () => {
    try {
      // Recuperiamo il token di sicurezza dal disco
      const token = localStorage.getItem('token_campo_minato');
      if (!token) return;

      // Chiamiamo la rotta corretta passando il token nell'intestazione
      const response = await fetch(`${API_URL}/api/shop/mio`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Errore nel caricamento inventario');
      
      const dati = await response.json();
      
      // Il server ci risponde con un array "inventario"
      listaAcquisti.value = dati.inventario.map(item => item.id_oggetto);
      console.log("Oggetti Acquistati caricati correttamente:", listaAcquisti.value);
    } catch (err) {
      errore.value = err.message;
      console.error(err);
    }
  }

  const caricaShop = async () => {
    try {
      const response = await fetch(`${API_URL}/api/shop/oggetti`)
      if (!response.ok) throw new Error('Errore nel caricamento shop')
      const dati = await response.json()
      listaOggetti.value = dati.items
      console.log("Oggetti caricati correttamente:", listaOggetti.value)
    } catch (err) {
      errore.value = err.message
      console.error(err)
    }
  }

  const effettuaAcquisto = async (item) => {
    // Controllo di sicurezza rapido lato Client
    if (sessione.utente.valuta < item.prezzo) {
        alert("Non hai abbastanza monete per acquistare questo oggetto!");
        return;
    }

    try {
        const token = localStorage.getItem('token_campo_minato');
        
        // Chiamata POST al database
        const response = await fetch(`${API_URL}/api/shop/acquista`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ id_oggetto: item.id_oggetto })
        });

        const dati = await response.json();

        if (response.ok) {
            // L'acquisto è andato a buon fine nel DB
            
            // Aggiungiamo l'oggetto alla lista 
            listaAcquisti.value.push(item.id_oggetto);
            
            // Scaliamo i soldi in tempo reale dalla UI e salviamo in locale
            sessione.utente.valuta -= item.prezzo;
            sessione.setUtente(sessione.utente); 

            // Equipaggiamo subito l'oggetto
            if (item.tipo == "tema") skin.cambiaTema(item.asset_url);
            else if (item.tipo == "sfondo") skin.cambiaSfondo(`url('${item.asset_url}')`);
            else if (item.tipo == "icona") skin.cambiaIcona(item.asset_url);

            alert("Acquisto completato con successo!");
        } else {
            // Se il server ha bloccato l'acquisto
            alert(dati.error || "Errore durante l'acquisto.");
        }
    } catch (err) {
        console.error("Errore di rete durante l'acquisto:", err);
        alert("Impossibile contattare il server.");
    }
  }

  // Carichiamo tutto all'avvio
  onMounted(() => {
      caricaShop();
      if (sessione.utente) {
          caricaOggettiAcquistati();
      }
  });
</script>

<template>
  <div id="main">
    <div id="finestra_shop" class="finestra">

      <div id="div_soldi">
        <!-- Controlla se l'utente esiste, altrimenti mostra 0 -->
        <label>Saldo disponibile : {{ sessione.utente ? sessione.utente.valuta : 0 }} 💰</label>
      </div>

      <div id="div_temi">
        <h2>Temi:</h2>
        <div class="riga_oggetti">
          <div v-for="item in temi" :key="item.id" class="slot_oggetto">
            <div class="anteprima" :style="{ backgroundColor: item.asset_url }" @click="effettuaAcquisto(item)"></div>
            <span>{{ item.nome }}</span>
            <span v-if="!listaAcquisti.includes(item.id_oggetto)">💰 {{ item.prezzo }}</span>   <!-- se non è nella listaAcquisti allora ne visualizza il prezzo-->
            <span v-else class="span_acquisto"> Acquistato ✅</span>                                                  <!--altrimenti visualizza che è stato acquistato-->
          </div>
        </div>
      </div>

      <div id="div_sfondi">
        <h2>Sfondi:</h2>
        <div class="riga_oggetti">
          <div v-for="item in sfondi" :key="item.id" class="slot_oggetto">
            <div class="anteprima" :style="{ 
              backgroundImage: `url(${item.asset_url})`, 
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }" @click="effettuaAcquisto(item)"></div>
            <span>{{ item.nome }}</span>
            <span v-if="!listaAcquisti.includes(item.id_oggetto)">💰 {{ item.prezzo }}</span>
            <span v-else class="span_acquisto"> Acquistato ✅</span>
          </div>
        </div>
      </div>

      <div id="div_icone">
        <h2>Icone Profilo:</h2>
        <div class="riga_oggetti">
          <div v-for="item in icone" :key="item.id" class="slot_oggetto">
            <div class="anteprima anteprima_icone" @click="effettuaAcquisto(item)">
              {{ item.asset_url }}
            </div>
            <span>{{ item.nome }}</span>
            <span v-if="!listaAcquisti.includes(item.id_oggetto)">💰 {{ item.prezzo }}</span>
            <span v-else class="span_acquisto"> Acquistato ✅</span>
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

  #div_soldi{
    font-size: large;
    font-weight: bold;
    box-sizing: border-box;
    text-align: right;
    padding: 10px;
    width: 100%;
  }
  #div_temi,#div_sfondi,#div_icone{
    margin : 10px 10px;
    padding : 10px 10px 0 10px;
    border-radius: 5px;
    background-color: color-mix(in srgb, var(--bg-color), white 20%);
  }

  .riga_oggetti {
    display: flex;
    gap: 10px;
    overflow-x: auto;
    scrollbar-color : color-mix(in srgb, var(--bg-color), black 50%) color-mix(in srgb, var(--bg-color), white 20%);
    margin-bottom : 2dvh;
    padding-bottom: 2dvh;
  }

  .slot_oggetto {
    width: 7dvw;
    min-width: 90px;
    display: flex;
    flex-direction: column;
    justify-content: top;
    align-items: center;
    flex-shrink: 0;
    margin-top:10px;
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
  }

  .anteprima_icone {
    font-size: 200%;
    background-color: #f0f0f0;
    user-select: none;
  }

  .span_acquisto{
    font-size: 1.1rem;
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