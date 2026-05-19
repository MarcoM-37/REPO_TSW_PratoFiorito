<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { sessione, notifica, skin } from '../../ambiente.js'
import { socket } from '../../socket.js'
import { apiFetch } from '../../api/index.js'
import Loading from '../../components/Loading.vue'
import Errore from '../../components/Errore.vue'

// Recupera l'indirizzo (locale o online) dal file .env
const API_URL = import.meta.env.VITE_SOCKET_URL

const router = useRouter()

const VaiSignUp = () => {
  router.push('/signup')
}

const email = ref('')
const password = ref('')

const errore = ref(null)
const caricamento = ref(false)

const refreshLogin = () => {
  email.value = ''
  password.value = ''
  errore.value = null
}

const gestisciLogin = async () => {
  caricamento.value = true
  errore.value = null
  try {
    const dati = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: email.value, password: password.value }),
    })

    sessione.setUtente(dati.user)
    localStorage.setItem('token_campo_minato', dati.token)

    skin.cambiaTema(dati.user.tema)
    skin.cambiaSfondo(
      dati.user.sfondo.startsWith('url') ? dati.user.sfondo : `url('${dati.user.sfondo}')`,
    )
    skin.cambiaIcona(dati.user.icona)

    socket.auth = { token: dati.token }
    socket.connect()
    router.push('/')
  } catch (err) {
    // Mostriamo in rosso l'errore
    errore.value = err.message
  } finally {
    caricamento.value = false
  }
}
</script>

<template>
  <div id="main">
    <Loading v-if="caricamento" messaggio="Login in corso..."></Loading>

    <Errore v-else-if="errore" :messaggio="errore" @riprova="refreshLogin"></Errore>

    <div v-else id="finestraLogin" class="finestra">
      <form @submit.prevent="gestisciLogin">
        <div id="div_email">
          <label for="email">Email: </label> <br />
          <input v-model="email" type="email" id="email" required />
        </div>

        <div id="div_password">
          <label for="password">Password:</label><br />
          <input v-model="password" type="password" id="password" name="password" required />
        </div>

        <div id="div_bottoni">
          <button type="button" @click="VaiSignUp">Non hai un account? Registrati</button>

          <button type="submit">Accedi</button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
/* Il contenitore si adatta al telefono (90%) ma si ferma a 400px sui PC */
#finestraLogin {
  margin: 10vh auto;
  width: 90%;
  max-width: 400px;
  padding: 30px;
  border-radius: 12px;
  box-sizing: border-box;
  height: fit-content;
}

#div_email,
#div_password {
  display: flex;
  flex-direction: column;
  margin-bottom: 20px;
  font-size: 1.2rem;
  text-align: left;
}

/* L'input prende tutto lo spazio disponibile del contenitore */
input {
  width: 100%;
  font-size: 1rem;
  padding: 12px;
  margin-top: 8px;
  box-sizing: border-box;
  border-radius: 6px;
  border: none;
}

/* Contenitore bottoni: colonna su mobile, riga su desktop */
#div_bottoni {
  margin-top: 90px;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

button {
  padding: 10px;
  font-size: 1rem;
  cursor: pointer;
  border-radius: 6px;
  border: none;
  width: 100%;
  transition: background-color 0.2s;
}

button:hover {
  filter: brightness(0.9);
}

/* Se lo schermo è più largo di 480px (es. tablet o PC), i bottoni si affiancano */
@media (min-width: 480px) {
  #div_bottoni {
    flex-direction: row;
    justify-content: space-between;
  }
  button {
    width: 48%; /* Ogni bottone prende quasi metà spazio */
  }
}
</style>
