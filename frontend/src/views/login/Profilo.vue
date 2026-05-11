<script setup>
    import { skin } from '../../ambiente'
    import { sessione } from '../../ambiente.js'
    import { ref, onMounted } from 'vue'
    import Loading from '../../components/Loading.vue'
    import Errore from '../../components/Errore.vue'

    const listaAmici = ref([])
    const mostraAggiungi = ref(false)
    const nomeAmico= ref('')

    const errore = ref(null)
    const caricamento = ref(false)

    const caricaAmici = async () => {
        caricamento.value = true
        try {
            const response = await fetch(`${API_URL}/api/amici`)
            if (!response.ok) throw new Error('Errore nel caricamento lista amici')
            const dati = await response.json()
            listaAmici.value = dati.items
            console.log('Lista amici caricata correttamente:', listaAmici.value)
        } catch (err) {
            errore.value = err.message
            console.error(err)
        } finally {
            caricamento.value = false
        }
    }

    const mostraAggiungiAmici = () => {
        mostraAggiungi.value = true;
    }
    const nascondiAggiungiAmici = () => {
        mostraAggiungi.value = false;
    }

    const AggiungiAmico = async () => {
        caricamento.value = true 
        try {
            const response = await fetch(`${API_URL}/...`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nome: nomeAmico.value
            }),
            })

            const dati = await response.json()

            // Usiamo response.ok che controlla se lo stato HTTP è positivo (es. 200 OK)
            if (response.ok) {
                console.log("ok")
            } else {
                // Se fallisce, usiamo l'errore del backend o un messaggio generico
                notifica.mostra(dati.error || 'Errore sconosciuto')
            }
        } catch (err) {
            console.error('Errore di connessione:', err)
            errore.value = err.message
        } finally {
            caricamento.value = false
        }
    }

    // onMounted(caricaAmici)

</script>

<template>
    <div id="main">
        <div id="div_profilo" class="finestra">
            <div id="div_nome_icona">
                <div id="div_icona">
                    {{ skin.icona }}
                </div>
                <span id="nome">{{ sessione.utente.username }}</span>
            </div>
            
            <div id="div_statistiche">
                <span>Partite giocate: 30</span>
                <span>Punti totali : 102020</span>
                <span>Winrate : 30%</span>
                <span>Soldi: 100000</span>
            </div>

            <Loading v-if="caricamento" messaggio="Caricamento lista amici..."></Loading>

            <Errore v-else-if="errore" :messaggio="errore" @riprova="caricaAmici"></Errore>

            <div id="div_listaAmici">
                <span>Lista Amici:</span>
                <div id="box_listaAmici">
                    <span>AAAAAAAAAAAA</span>
                    <span>AAAAAAAAAAAA</span>
                    <span>AAAAAAAAAAAA</span>
                    <span>AAAAAAAAAAAA</span>
                    <div v-for="persona in listaAmici" id="div_amico">
                        <span>{{ persona }}</span>
                    </div>
                </div>
                <button @click="mostraAggiungiAmici">Aggiungi amici</button>
            </div>

            <div v-if="mostraAggiungi" id="outer_aggiungiAmico">
                <div id="inner_aggiungiAmico">
                    <span>Aggiungi amico:</span>
                    <form @submit.prevent="AggiungiAmico">
                        <label for="nomeAmico">nome:</label> <input v-model="nomeAmico" id="nomeAmico"> 
                        <button @click="nascondiAggiungiAmici">Annulla</button> <button type="submit">Aggiungi</button> 
                    </form>
                </div>
                
            </div>

        </div>
    </div>
    
</template>

<style scoped>
    #div_profilo {
        width : 40%;
        max-width: 600px;
        height: 400px;
        margin-top: 4%;
        padding: 3rem;
    }
    #div_icona {
        width: 100px;
        height: 100px;
        margin-right: 50px;
        background-color: color-mix(in srgb, var(--bg-color),white 20%);
        border-radius: 10px;
        display: flex;
        justify-content: center;
        align-items: center;
        font-size: 3rem;
    }
    #nome{
        font-size: 2rem;
    }
    #div_nome_icona {
        display: flex;
    }

    #div_statistiche {
        width: 100%;
        display: flex;
        flex-direction: column;
        text-align: end;
    }

    #box_listaAmici {
        display: flex;
        flex-direction: column;
        margin: 20px;
    }
    #outer_aggiungiAmico {
        background-color:rgba(255, 255, 255, 0.295);
        z-index: 1;
        position: fixed;
        top:0;
        left:0;
        width:100vw;
        height:100vh;
        display: flex;
        justify-content: center;
        align-items: center;
    }
    #inner_aggiungiAmico {
        background-color: var(--bg-color);
        padding: 60px;
        border-radius: 10px;
    }
</style>