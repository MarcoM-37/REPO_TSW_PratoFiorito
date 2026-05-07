<script setup>
    defineProps(['messaggio'])
</script>

<template>
  <div class="loader-overlay">
    <div class="loader-container">
      <div class="spinner"></div>
      <p class="testo-caricamento">{{ messaggio || 'Caricamento in corso...' }}</p>
    </div>
  </div>
</template>

<style scoped>
    .loader-overlay {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 20px;
    }

    .loader-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 15px;
    }

    .spinner {
    width: 50px;
    height: 50px;
    border: 5px solid color-mix(in srgb, var(--bg-color), grey 10%);
    border-top-color:  color-mix(in srgb, var(--bg-color), black 50%); 
    border-radius: 50%;
    animation: spin 1s ease infinite;
    }

    .testo-caricamento {
    color: white;
    font-weight: bold;
    letter-spacing: 1px;
    }

    @keyframes spin {
    to { transform: rotate(360deg); }
    }
</style>