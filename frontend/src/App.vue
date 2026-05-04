<script setup>
import Header from '@/components/Header.vue'
import { skin, notifica } from '@/ambiente.js'
</script>

<template >
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
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
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
  from { transform: scale(0.8); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
</style>