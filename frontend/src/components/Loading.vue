<script setup>
    defineProps(['messaggio'])
</script>

<template>
  <div id="div_loading">
    <div id="div_messaggio_spinner" class="finestra">
      <div class="spinner"></div>
      <span class="testo-caricamento">{{ messaggio || 'Caricamento in corso...' }}</span>
    </div>
  </div>
</template>

<style scoped>
    #div_loading {
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 20px;
    }

    #div_messaggio_spinner {
        padding : 20px;
        border-radius : 10px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 15px;
    }

    .spinner {
        width: 50px;
        height: 50px;
        border-radius: 50%;     /*rende il div un cerchio */
        border: 5px solid color-mix(in srgb, var(--bg-color), grey 10%);    /*tutto il bordo avrà questo colore*/
        border-top-color:  color-mix(in srgb, var(--bg-color), black 50%);  /*solo il bordo sopra avrà questo colore (la parte più scura che ci sembra ruotare*/
        animation: spin 1s ease infinite;       /* uso l'animazione che ho creato, la faccio durare 1s, ease per farla in modo fluido (lento inizio, veloce centro, lento fine) e faccio in modo che si ripeta all'infinito*/
    }

    .testo-caricamento {
        color: black;
        font-weight: bold;
        letter-spacing: 1px;
        }

    @keyframes spin {       /* keyframes definisce gli step di un'animazione, ne creo una 'spin' con solo l'istruzione che alla fine (to) fa ruotare tutto di 360° */
        to { transform: rotate(360deg); }
    }
</style>