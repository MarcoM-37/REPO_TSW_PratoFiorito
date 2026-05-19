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

const VaiLogin = () => {
  router.push('/login')
}

// Definiamo i dati del form in modo reattivo
const username = ref('')
const email = ref('')
const password = ref('')
const confermaPassword = ref('')

const errore = ref(null)
const caricamento = ref(false)

const refreshSignup = () => {
  username.value = ''
  email.value = ''
  password.value = ''
  confermaPassword.value = ''
  errore.value = null
}

const gestisciSignup = async () => {
  caricamento.value = true
  errore.value = null
  try {
    const dati = await apiFetch('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        username: username.value,
        email: email.value,
        password: password.value,
      }),
    })

    // Niente più if(response.ok). Se il codice arriva qui, il login è riuscito!
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
    // Mostriamo in rosso l'errore (es. "Credenziali non valide")
    errore.value = err.message
  } finally {
    caricamento.value = false
  }
}
</script>

<template>
  <div id="main">
    <Loading v-if="caricamento" messaggio="Registrazione in corso..."></Loading>

    <Errore v-else-if="errore" :messaggio="errore" @riprova="refreshSignup"></Errore>

    <div v-else id="finestraSignup" class="finestra">
      <form @submit.prevent="gestisciSignup">
        <div id="div_username">
          <label for="username">Username:</label> <br />
          <input v-model="username" type="text" id="username" required />
        </div>

        <div id="div_email">
          <label for="email">Email:</label> <br />
          <input v-model="email" type="email" id="email" required />
        </div>

        <div id="div_password">
          <label for="password">Password:</label> <br />
          <input v-model="password" type="password" id="password" required />
        </div>

        <div id="div_confermaPassword">
          <label for="confermaPassword">Conferma Password:</label> <br />
          <input v-model="confermaPassword" id="confermaPassword" type="password" required />
        </div>

        <div id="div_bottoni">
          <button type="button" @click="VaiLogin">Hai già un account? Accedi</button>

          <button type="submit">Registrati</button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
#finestraSignup {
  margin: 5vh auto;
  width: 90%;
  max-width: 450px;
  padding: 30px;
  border-radius: 12px;
  box-sizing: border-box;
  height: fit-content;
}

#div_username,
#div_email,
#div_password,
#div_confermaPassword {
  display: flex;
  flex-direction: column;
  margin-bottom: 15px;
  font-size: 1.2rem;
  text-align: left;
}

input {
  width: 100%;
  font-size: 1rem;
  padding: 10px;
  margin-top: 5px;
  box-sizing: border-box;
  border-radius: 6px;
  border: none;
}

#div_bottoni {
  margin-top: 90px;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

button {
  padding: 12px;
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

@media (min-width: 480px) {
  #div_bottoni {
    flex-direction: row;
    justify-content: space-between;
  }
  button {
    width: 48%;
  }
}
</style>
